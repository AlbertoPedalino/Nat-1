import { saveBuilderCharacter } from '../../../../src/pages/charbuilder/state/cloudSave.js';
import { SHEET_CONFLICT } from '../../../../src/shared/cloud/api/cloudCharacters.js';
import { CHARACTER_SHEET_SAVED_EVENT } from '../../../../src/shared/cloud/sync/characterEvents.js';

// The builder's cloud saves against a server that behaves like the database
// (13_character_vitals.sql): an existing row is updated only at the expected
// sheet_revision; vitals and runtime-only keys never move that revision.

const VITALS = ['currentHP', 'tempHP', 'maxHPBonus', 'deathSaves', 'activeConditions'];
const RUNTIME_ONLY = ['optionalFeatureEntries'];
const content = (data) => JSON.stringify(Object.fromEntries(
  Object.entries(data || {}).filter(([key]) => !VITALS.includes(key) && !RUNTIME_ONLY.includes(key)).sort(),
));

const db = vi.hoisted(() => ({ rows: new Map(), fullReads: 0, writes: [], user: 'player' }));
vi.mock('../../../../src/shared/cloud/supabaseClient.js', () => ({
  requireClient: () => ({
    auth: { getUser: async () => ({ data: { user: { id: db.user, user_metadata: { username: db.user } } }, error: null }) },
    from: () => ({
      select: (columns) => ({
        eq: (_column, id) => ({
          maybeSingle: async () => {
            const row = db.rows.get(id);
            if (!row) return { data: null };
            return { data: columns === 'owner' ? { owner: row.owner } : { sheet_revision: row.sheet_revision } };
          },
          single: async () => {
            db.fullReads += 1;
            return { data: db.rows.get(id) ? structuredClone(db.rows.get(id)) : null };
          },
        }),
      }),
      insert: (row) => ({
        select: () => ({
          maybeSingle: async () => {
            if (db.rows.has(row.id)) return { data: null, error: { code: '23505', message: 'duplicate key' } };
            const stored = { id: row.id, owner: row.owner, name: row.name, sheet_revision: 0, data: structuredClone(row.data) };
            db.rows.set(row.id, stored);
            db.writes.push({ kind: 'insert', data: row.data });
            return { data: { sheet_revision: 0 }, error: null };
          },
        }),
      }),
      update: (payload) => {
        const filters = {};
        const chain = {
          eq(column, value) { filters[column] = value; return chain; },
          select: () => ({
            maybeSingle: async () => {
              const row = db.rows.get(filters.id);
              if (!row) return { data: null };
              if (Object.hasOwn(filters, 'sheet_revision') && filters.sheet_revision !== row.sheet_revision) return { data: null };
              // The trigger: health is preserved, runtime-only keys dropped,
              // sheet_revision moves only when the content does.
              const next = Object.fromEntries(Object.entries(payload.data).filter(([key]) => !RUNTIME_ONLY.includes(key)));
              for (const key of VITALS) { if (key in row.data) next[key] = row.data[key]; else delete next[key]; }
              const changed = content(next) !== content(row.data) || payload.name !== row.name;
              db.writes.push({ kind: 'update', data: payload.data, expected: filters.sheet_revision ?? null });
              Object.assign(row, { data: next, name: payload.name, sheet_revision: row.sheet_revision + (changed ? 1 : 0) });
              return { data: { id: row.id, sheet_revision: row.sheet_revision } };
            },
          }),
        };
        return chain;
      },
    }),
  }),
}));

const SHEET = { name: 'Aria', className: 'Fighter', level: 3, currentHP: 20, inventory: [], notes: '' };
const existing = (revision = 5, data = SHEET) => db.rows.set('pc', {
  id: 'pc', owner: 'player', name: data.name, sheet_revision: revision, data: structuredClone(data),
});
// The GM saves the sheet from elsewhere; a health command changes only vitals.
const gmEdits = (patch) => {
  const row = db.rows.get('pc');
  Object.assign(row, { data: { ...row.data, ...patch }, sheet_revision: row.sheet_revision + 1 });
};
const healthCommand = (currentHP) => { db.rows.get('pc').data.currentHP = currentHP; };
const save = (character, knownRevision, created = true) => saveBuilderCharacter({ id: 'pc', character, created, knownRevision });

beforeEach(() => {
  db.rows = new Map();
  db.fullReads = 0;
  db.writes = [];
  db.user = 'player';
});

test('normal save: expected 5 → saved, revision 6 held, own save announced, no sheet downloaded', async () => {
  existing(5);
  const announced = vi.fn();
  const onSaved = (event) => announced(event.detail);
  window.addEventListener(CHARACTER_SHEET_SAVED_EVENT, onSaved);
  try {
    await expect(save({ ...SHEET, level: 4 }, 5)).resolves.toEqual({ id: 'pc', sheetRevision: 6 });
  } finally {
    window.removeEventListener(CHARACTER_SHEET_SAVED_EVENT, onSaved);
  }
  expect(db.writes).toEqual([expect.objectContaining({ kind: 'update', expected: 5 })]);
  expect(db.rows.get('pc').data.level).toBe(4);
  expect(announced).toHaveBeenCalledWith({ characterId: 'pc', sheetRevision: 6 });
  expect(db.fullReads).toBe(0);
});

test('concurrent GM edit: a save based on 5 overwrites nothing and is a SHEET_CONFLICT', async () => {
  existing(5);
  gmEdits({ inventory: [{ name: 'Rope' }] }); // → revision 6
  await expect(save({ ...SHEET, notes: 'builder edit' }, 5))
    .rejects.toMatchObject({ code: SHEET_CONFLICT, remoteSheetRevision: 6 });
  expect(db.writes).toEqual([]);
  expect(db.rows.get('pc').data.inventory).toEqual([{ name: 'Rope' }]);
  expect(db.rows.get('pc').data.notes).toBe('');
  expect(db.fullReads).toBe(0);
});

test('a GM edit on a player sheet opened in the builder is conditional too', async () => {
  existing(5);
  db.user = 'gm';
  await expect(save({ ...SHEET, level: 4 }, 5)).resolves.toMatchObject({ sheetRevision: 6 });
  gmEdits({ notes: 'player note' });
  await expect(save({ ...SHEET, level: 5 }, 6)).rejects.toMatchObject({ code: SHEET_CONFLICT });
  expect(db.rows.get('pc').data.level).toBe(4);
});

test('a health command meanwhile does not make the builder stale', async () => {
  existing(5);
  healthCommand(7); // sheet_revision stays 5
  expect(db.rows.get('pc').sheet_revision).toBe(5);
  await expect(save({ ...SHEET, level: 4, currentHP: 20 }, 5)).resolves.toMatchObject({ sheetRevision: 6 });
  expect(db.rows.get('pc').data.currentHP).toBe(7); // health is not the builder's to write
});

test('a builder that never saw an existing row (failed load) refuses to overwrite it', async () => {
  existing(5);
  await expect(save({ name: 'Blank' }, null, false)).rejects.toMatchObject({ code: SHEET_CONFLICT, remoteSheetRevision: 5 });
  await expect(save({ name: 'Blank' }, null, true)).rejects.toMatchObject({ code: SHEET_CONFLICT });
  expect(db.writes).toEqual([]);
  expect(db.rows.get('pc').data).toEqual(SHEET);
});

test('new character: created with its first revision, and every later save is conditional', async () => {
  const created = await save(SHEET, null, false);
  expect(created).toEqual({ id: 'pc', sheetRevision: 0 });
  expect(db.writes).toEqual([expect.objectContaining({ kind: 'insert' })]);
  await expect(save({ ...SHEET, level: 2 }, created.sheetRevision)).resolves.toMatchObject({ sheetRevision: 1 });
  expect(db.writes[1]).toMatchObject({ kind: 'update', expected: 0 });
  // An id someone else created meanwhile is not taken over.
  db.rows.delete('other');
  db.rows.set('other', { id: 'other', owner: 'someone', name: 'X', sheet_revision: 2, data: {} });
  await expect(saveBuilderCharacter({ id: 'other', character: SHEET, created: false, knownRevision: null }))
    .rejects.toMatchObject({ code: SHEET_CONFLICT });
});

test('runtime-only catalog: never sent, never a content change, never a conflict', async () => {
  existing(5);
  const catalog = [{ name: 'Agonizing Blast', entries: ['…'] }];
  await expect(save({ ...SHEET, optionalFeatureEntries: catalog }, 5)).resolves.toEqual({ id: 'pc', sheetRevision: 5 });
  expect(db.writes[0].data).not.toHaveProperty('optionalFeatureEntries');
  expect(db.rows.get('pc').data).not.toHaveProperty('optionalFeatureEntries');
  await expect(save({ ...SHEET, notes: 'n', optionalFeatureEntries: catalog }, 5)).resolves.toMatchObject({ sheetRevision: 6 });
});
