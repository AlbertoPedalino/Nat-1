import {
  pullCharacter, pushCharacter, pushCharacterData, updateCloudCharacterData, updateForeignCharacter,
} from '../../../../../src/shared/cloud/api/cloudCharacters.js';
import {
  getCharacterSyncMeta, hasUnsyncedLocalChanges, loadCharacter, markCharacterSynced, patchCharacter, saveCharacter,
} from '../../../../../src/shared/character/profile/store.js';
import { SHEET_CONFLICT } from '../../../../../src/shared/cloud/api/cloudCharacters.js';
import { CHARACTER_SHEET_SAVED_EVENT } from '../../../../../src/shared/cloud/sync/characterEvents.js';

// The optional-feature catalog an open sheet carries (runtimeFields.js) never
// reaches characters.data or local storage, whatever the write path.

// A `characters` row: its owner, its sheet_revision, and whether this user may
// write it. Updates honour `.eq('sheet_revision', expected)` like PostgREST.
const server = vi.hoisted(() => ({ owner: null, row: null, writes: [], revision: 3, denied: false, revisionReads: 0 }));
vi.mock('../../../../../src/shared/cloud/supabaseClient.js', () => ({
  requireClient: () => ({
    auth: { getUser: async () => ({ data: { user: { id: 'me', user_metadata: { username: 'me' } } }, error: null }) },
    from: () => ({
      select: (columns) => ({
        eq: () => ({
          maybeSingle: async () => {
            if (columns === 'sheet_revision') {
              server.revisionReads += 1;
              return { data: server.owner ? { sheet_revision: server.revision } : null };
            }
            return { data: server.owner ? { owner: server.owner } : null };
          },
          single: async () => ({ data: server.row }),
        }),
      }),
      upsert: (row) => {
        server.writes.push({ kind: 'upsert', data: row.data });
        server.revision += 1;
        return { select: () => ({ maybeSingle: async () => ({ data: { sheet_revision: server.revision }, error: null }) }) };
      },
      insert: (row) => {
        server.writes.push({ kind: 'insert', data: row.data });
        server.revision = 0;
        return { select: () => ({ maybeSingle: async () => ({ data: { sheet_revision: 0 }, error: null }) }) };
      },
      update: (payload) => {
        const filters = {};
        const chain = {
          eq(column, value) { filters[column] = value; return chain; },
          select: () => ({
            maybeSingle: async () => {
              if (server.denied) return { data: null };
              if (Object.hasOwn(filters, 'sheet_revision') && filters.sheet_revision !== server.revision) return { data: null };
              server.writes.push({ kind: 'update', data: payload.data, expected: filters.sheet_revision ?? null });
              server.revision += 1;
              return { data: { id: 'pc', sheet_revision: server.revision } };
            },
          }),
        };
        return chain;
      },
    }),
  }),
}));

const CATALOG = [{ name: 'Agonizing Blast', source: 'XPHB', featureType: ['EI'], entries: ['rule text'] }];
const SHEET = { name: 'Warlock', level: 5, notes: 'n', choices: { invocations: ['Agonizing Blast'] } };
const stored = () => JSON.parse(localStorage.getItem('gb:char:pc'));

beforeEach(() => {
  localStorage.clear();
  server.owner = null;
  server.row = null;
  server.writes = [];
  server.revision = 3;
  server.denied = false;
  server.revisionReads = 0;
});

describe('local storage', () => {
  test('save, patch and create never persist the catalog', () => {
    const saved = saveCharacter('pc', { ...SHEET, optionalFeatureEntries: CATALOG }, { emit: false });
    expect(saved).not.toHaveProperty('optionalFeatureEntries');
    expect(stored()).not.toHaveProperty('optionalFeatureEntries');
    patchCharacter('pc', { notes: 'x', optionalFeatureEntries: CATALOG }, { emit: false });
    expect(stored()).toMatchObject({ notes: 'x' });
    expect(stored()).not.toHaveProperty('optionalFeatureEntries');
  });

  test('an older local copy that still carries it is read without it', () => {
    localStorage.setItem('gb:char:pc', JSON.stringify({ ...SHEET, optionalFeatureEntries: CATALOG }));
    expect(loadCharacter('pc')).toEqual(SHEET);
  });
});

describe('characters.data', () => {
  test.each([
    ['sheet autosave (update)', () => {
      server.owner = 'me';
      return updateCloudCharacterData('pc', { ...SHEET, optionalFeatureEntries: CATALOG }, { expectedSheetRevision: 3 });
    }],
    ['builder / first command (insert)', () => pushCharacterData('pc', { ...SHEET, optionalFeatureEntries: CATALOG })],
    ['GM editing someone else\'s sheet from the builder (conditional update)', () => {
      server.owner = 'player';
      return pushCharacterData('pc', { ...SHEET, optionalFeatureEntries: CATALOG }, { expectedSheetRevision: 3 });
    }],
  ])('%s sends no catalog', async (_label, write) => {
    await write();
    expect(server.writes).toHaveLength(1);
    expect(server.writes[0].data).toEqual(SHEET);
  });

  test.each([
    ['autosync push of my new sheet (insert)', null],
    ['autosync push of a GM edit (conditional update)', 'player'],
  ])('%s sends no catalog, even from an older local copy', async (_label, owner) => {
    // Written before local storage stripped it.
    localStorage.setItem('gb:char:pc', JSON.stringify({ ...SHEET, optionalFeatureEntries: CATALOG }));
    if (owner) markCharacterSynced('pc', 3);
    server.owner = owner;
    await (owner ? updateForeignCharacter('pc') : pushCharacter('pc'));
    expect(server.writes).toHaveLength(1);
    expect(server.writes[0].kind).toBe(owner ? 'update' : 'insert');
    expect(server.writes[0].data).toEqual(SHEET);
  });

  test('pulling an older cloud row does not copy the catalog into local storage', async () => {
    server.row = { data: { ...SHEET, optionalFeatureEntries: CATALOG }, sheet_revision: 7 };
    const pulled = await pullCharacter('pc');
    expect(pulled).toEqual(SHEET);
    expect(stored()).not.toHaveProperty('optionalFeatureEntries');
    expect(stored()).toMatchObject(SHEET);
    // The pulled copy is the cloud's: aligned with its revision, nothing to push.
    expect(getCharacterSyncMeta('pc')).toMatchObject({ sheetRevision: 7 });
    expect(hasUnsyncedLocalChanges('pc')).toBe(false);
  });
});

describe('sheet revisions', () => {
  const savedEvents = vi.fn();
  const onSaved = (event) => savedEvents(event.detail);
  beforeEach(() => { savedEvents.mockReset(); window.addEventListener(CHARACTER_SHEET_SAVED_EVENT, onSaved); });
  afterEach(() => window.removeEventListener(CHARACTER_SHEET_SAVED_EVENT, onSaved));

  test('a whole-sheet save answers with, and announces, the revision it produced', async () => {
    server.owner = 'me';
    await expect(updateCloudCharacterData('pc', SHEET, { expectedSheetRevision: 3 })).resolves.toEqual({ id: 'pc', sheetRevision: 4 });
    expect(server.writes[0].expected).toBe(3);
    expect(savedEvents).toHaveBeenCalledWith({ characterId: 'pc', sheetRevision: 4 });
  });

  test('a stale expected revision writes nothing and is a conflict, not a permission error', async () => {
    server.owner = 'me';
    server.revision = 9; // the GM saved meanwhile
    await expect(updateCloudCharacterData('pc', SHEET, { expectedSheetRevision: 3 }))
      .rejects.toMatchObject({ code: SHEET_CONFLICT, remoteSheetRevision: 9 });
    expect(server.writes).toEqual([]);
    expect(savedEvents).not.toHaveBeenCalled();
  });

  test('a missing permission stays a permission error', async () => {
    server.owner = 'me';
    server.denied = true;
    await expect(updateCloudCharacterData('pc', SHEET, { expectedSheetRevision: 3 })).rejects.toThrow('No permission');
  });

  test('a local copy pushes against the revision it was aligned with, then records the new one', async () => {
    server.owner = 'me';
    saveCharacter('pc', SHEET, { emit: false });
    markCharacterSynced('pc', 3);
    patchCharacter('pc', { notes: 'edited' }, { emit: false });
    saveCharacter('pc', { ...stored(), notes: 'edited' }); // a local edit
    expect(hasUnsyncedLocalChanges('pc')).toBe(true);
    await pushCharacter('pc');
    expect(server.writes[0]).toMatchObject({ kind: 'update', expected: 3 });
    expect(getCharacterSyncMeta('pc').sheetRevision).toBe(4);
    expect(hasUnsyncedLocalChanges('pc')).toBe(false);
  });

  test('a stale local copy cannot overwrite a newer cloud sheet', async () => {
    server.owner = 'me';
    saveCharacter('pc', SHEET, { emit: false });
    markCharacterSynced('pc', 3);
    saveCharacter('pc', { ...SHEET, notes: 'offline edit' });
    server.revision = 8; // the GM added an item while this copy was closed
    await expect(pushCharacter('pc')).rejects.toMatchObject({ code: SHEET_CONFLICT });
    expect(server.writes).toEqual([]);
    expect(hasUnsyncedLocalChanges('pc')).toBe(true);
  });
});

describe('local copies with no known revision (legacy, pre-sheet_revision)', () => {
  test('a cloud row exists: nothing is written, one light read, SHEET_CONFLICT; the cloud is intact', async () => {
    saveCharacter('pc', { ...SHEET, notes: 'old local' }); // no sync metadata at all
    expect(getCharacterSyncMeta('pc').sheetRevision).toBeNull();
    server.owner = 'me';
    server.revision = 7;
    await expect(pushCharacter('pc')).rejects.toMatchObject({ code: SHEET_CONFLICT, remoteSheetRevision: 7 });
    expect(server.writes).toEqual([]);
    expect(server.revision).toBe(7);
    expect(server.revisionReads).toBe(1);
    expect(hasUnsyncedLocalChanges('pc')).toBe(true); // the local copy is kept, not marked synced
  });

  test('the same for a GM edit of a player sheet, and for any whole-sheet update without a revision', async () => {
    saveCharacter('pc', SHEET);
    server.owner = 'player';
    server.revision = 7;
    await expect(updateForeignCharacter('pc')).rejects.toMatchObject({ code: SHEET_CONFLICT, remoteSheetRevision: 7 });
    await expect(updateCloudCharacterData('pc', SHEET)).rejects.toMatchObject({ code: SHEET_CONFLICT });
    expect(server.writes).toEqual([]);
  });

  test('an explicit choice to keep the local copy saves it conditionally on the revision just read', async () => {
    saveCharacter('pc', { ...SHEET, notes: 'keep me' });
    server.owner = 'me';
    server.revision = 7;
    const conflict = await pushCharacter('pc').catch((error) => error);
    // What the sheet's "Keep my changes" does: rebase on that revision, push again.
    const { rebaseCharacterSync } = await import('../../../../../src/shared/character/profile/store.js');
    rebaseCharacterSync('pc', conflict.remoteSheetRevision);
    await pushCharacter('pc');
    expect(server.writes).toEqual([expect.objectContaining({ kind: 'update', expected: 7 })]);
    expect(getCharacterSyncMeta('pc').sheetRevision).toBe(8);
  });

  test('no cloud row: the local copy is created and its revision stored', async () => {
    saveCharacter('pc', SHEET);
    server.owner = null;
    await expect(pushCharacter('pc')).resolves.toEqual({ id: 'pc', sheetRevision: 0 });
    expect(server.writes).toEqual([expect.objectContaining({ kind: 'insert' })]);
    expect(getCharacterSyncMeta('pc').sheetRevision).toBe(0);
    expect(hasUnsyncedLocalChanges('pc')).toBe(false);
    expect(server.revisionReads).toBe(0);
  });
});

describe('local copies with a known revision (the normal path)', () => {
  test('known 7: one conditional update, no extra revision read', async () => {
    saveCharacter('pc', SHEET, { emit: false });
    markCharacterSynced('pc', 7);
    saveCharacter('pc', { ...SHEET, notes: 'edit' });
    server.owner = 'me';
    server.revision = 7;
    await expect(pushCharacter('pc')).resolves.toEqual({ id: 'pc', sheetRevision: 8 });
    expect(server.writes).toEqual([expect.objectContaining({ kind: 'update', expected: 7 })]);
    expect(server.revisionReads).toBe(0);
  });

  test('cloud moved to 8: refused, SHEET_CONFLICT, nothing overwritten', async () => {
    saveCharacter('pc', SHEET, { emit: false });
    markCharacterSynced('pc', 7);
    saveCharacter('pc', { ...SHEET, notes: 'stale edit' });
    server.owner = 'me';
    server.revision = 8;
    await expect(pushCharacter('pc')).rejects.toMatchObject({ code: SHEET_CONFLICT, remoteSheetRevision: 8 });
    expect(server.writes).toEqual([]);
  });

  test('a health command meanwhile leaves sheet_revision at 7: the push expected 7 still lands', async () => {
    saveCharacter('pc', SHEET, { emit: false });
    markCharacterSynced('pc', 7);
    saveCharacter('pc', { ...SHEET, notes: 'edit' });
    server.owner = 'me';
    server.revision = 7; // commit_character_vitals moved HP, not the sheet revision
    await expect(pushCharacter('pc')).resolves.toMatchObject({ sheetRevision: 8 });
    expect(server.writes[0]).toMatchObject({ expected: 7 });
  });
});
