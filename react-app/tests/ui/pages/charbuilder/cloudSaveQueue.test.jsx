import { createCloudSaveQueue } from '../../../../src/pages/charbuilder/state/cloudSaveQueue.js';
import { saveBuilderCharacter } from '../../../../src/pages/charbuilder/state/cloudSave.js';
import { SHEET_CONFLICT } from '../../../../src/shared/cloud/api/cloudCharacters.js';

// The builder's cloud saves go through one queue (as CharBuilder wires it):
// never two at once, a save requested meanwhile waits and then writes the
// latest builder state against the revision — or the row — the previous save
// produced. The server answers each write only when the test releases it.

const db = vi.hoisted(() => ({ row: null, requests: [], gates: [], inFlight: 0, maxInFlight: 0 }));
function gate() {
  let release;
  const promise = new Promise((resolve) => { release = resolve; });
  db.gates.push(release);
  return promise;
}
async function held(run) {
  db.inFlight += 1;
  db.maxInFlight = Math.max(db.maxInFlight, db.inFlight);
  try {
    await gate();
    return run();
  } finally {
    db.inFlight -= 1;
  }
}
vi.mock('../../../../src/shared/cloud/supabaseClient.js', () => ({
  requireClient: () => ({
    auth: { getUser: async () => ({ data: { user: { id: 'player', user_metadata: {} } }, error: null }) },
    from: () => ({
      select: (columns) => ({
        eq: () => ({
          maybeSingle: async () => {
            if (!db.row) return { data: null };
            return { data: columns === 'owner' ? { owner: db.row.owner } : { sheet_revision: db.row.sheet_revision } };
          },
        }),
      }),
      insert: (row) => ({
        select: () => ({
          maybeSingle: () => {
            db.requests.push({ kind: 'insert', notes: row.data.notes });
            return held(() => {
              if (db.row) return { data: null, error: { code: '23505' } };
              db.row = { owner: row.owner, sheet_revision: 0, data: row.data };
              return { data: { sheet_revision: 0 }, error: null };
            });
          },
        }),
      }),
      update: (payload) => {
        const filters = {};
        const chain = {
          eq(column, value) { filters[column] = value; return chain; },
          select: () => ({
            maybeSingle: () => {
              db.requests.push({ kind: 'update', expected: filters.sheet_revision, notes: payload.data.notes });
              return held(() => {
                if (filters.sheet_revision !== db.row.sheet_revision) return { data: null };
                db.row = { ...db.row, data: payload.data, sheet_revision: db.row.sheet_revision + 1 };
                return { data: { id: 'pc', sheet_revision: db.row.sheet_revision } };
              });
            },
          }),
        };
        return chain;
      },
    }),
  }),
}));

// The builder's refs and state, and its queued save (CharBuilder: cloudSaveQueueRef).
function builder({ created = false, revision = null } = {}) {
  const b = { created, revision, notes: '', conflict: null };
  b.enqueue = createCloudSaveQueue(async () => {
    if (b.conflict) return null;
    const result = await saveBuilderCharacter({
      id: 'pc', character: { name: 'Aria', notes: b.notes }, created: b.created, knownRevision: b.revision,
    });
    b.created = true;
    b.revision = result.sheetRevision;
    return result;
  });
  // The autosave's call site: a refused save becomes the conflict banner.
  b.autosave = () => b.enqueue().catch((error) => { if (error?.code === SHEET_CONFLICT) b.conflict = error; });
  return b;
}
const tick = () => new Promise((resolve) => { setTimeout(resolve, 0); });
async function release() { db.gates.shift()(); await tick(); await tick(); }

beforeEach(() => {
  db.row = null;
  db.requests = [];
  db.gates = [];
  db.inFlight = 0;
  db.maxInFlight = 0;
});

test('existing character: an edit during save A waits; save B then uses the revision A produced and the latest state', async () => {
  db.row = { owner: 'player', sheet_revision: 5, data: { notes: '' } };
  const b = builder({ created: true, revision: 5 });
  b.notes = 'a';
  const a = b.autosave();
  await tick();
  b.notes = 'ab';
  const second = b.autosave();
  b.notes = 'abc'; // still before B starts
  const third = b.autosave();
  await tick();
  expect(db.requests).toHaveLength(1);
  await release(); // A lands: revision 6
  await tick();
  expect(db.requests).toEqual([
    { kind: 'update', expected: 5, notes: 'a' },
    { kind: 'update', expected: 6, notes: 'abc' },
  ]);
  await release();
  await Promise.all([a, second, third]);
  expect(db.row).toMatchObject({ sheet_revision: 7, data: { notes: 'abc' } });
  expect(db.maxInFlight).toBe(1);
  expect(b.conflict).toBeNull();
});

test('new character: no second INSERT while the first is on its way; the next save updates at revision 0', async () => {
  const b = builder();
  b.notes = 'first';
  const a = b.autosave();
  await tick();
  b.notes = 'second';
  const next = b.autosave();
  await tick();
  expect(db.requests).toEqual([{ kind: 'insert', notes: 'first' }]);
  await release();
  await tick();
  expect(db.requests[1]).toEqual({ kind: 'update', expected: 0, notes: 'second' });
  await release();
  await Promise.all([a, next]);
  expect(db.row).toMatchObject({ sheet_revision: 1, data: { notes: 'second' } });
  expect(b.conflict).toBeNull();
});

test('a real external change during save A is still a conflict, and nothing queued runs over it', async () => {
  db.row = { owner: 'player', sheet_revision: 5, data: { notes: 'original' } };
  const b = builder({ created: true, revision: 5 });
  b.notes = 'mine';
  const a = b.autosave();
  await tick();
  b.notes = 'mine, more';
  const queued = b.autosave();
  db.row = { ...db.row, sheet_revision: 6, data: { notes: 'GM edit' } }; // the GM saves meanwhile
  await release();
  await Promise.all([a, queued]);
  expect(b.conflict).toMatchObject({ code: SHEET_CONFLICT, remoteSheetRevision: 6 });
  expect(db.requests).toHaveLength(1);
  expect(db.row.data.notes).toBe('GM edit');
});
