import test from 'node:test';
import assert from 'node:assert/strict';

// `deleteRegistryEntry` sweeps scoped keys via `Object.keys(localStorage)`,
// so the stub must expose keys as own enumerable props (set via `setItem`),
// not a Map-backed store — a Map stub would silently pass an empty sweep.
class MemoryStorage {
  setItem(key, value) { this[key] = String(value); }
  getItem(key) { return Object.prototype.hasOwnProperty.call(this, key) ? this[key] : null; }
  removeItem(key) { delete this[key]; }
  clear() { for (const k of Object.keys(this)) delete this[k]; }
  key(index) { return Object.keys(this)[index] ?? null; }
  get length() { return Object.keys(this).length; }
}

if (!globalThis.localStorage) {
  Object.defineProperty(globalThis, 'localStorage', { value: new MemoryStorage(), configurable: true });
}
if (!globalThis.window) {
  globalThis.window = {};
}
globalThis.window.confirm = () => true;
globalThis.prompt = (_message, defaultValue) => defaultValue;

const { REGISTRY_META, readRegistry, deleteRegistryEntry, renameRegistryEntry } = await import('../../../shared/localStorageRegistries.js');
const { resolveTool, LIBRARY_TOOLS } = await import('./tools.js');
const { mergeCharacterRows, canDeleteRow, deletePlanFor, loadCharacterRows } = await import('./characterRows.js');
const { mergeInstanceRows, loadInstanceRows, sectionDeletePlan, shouldPullCloudCopy } = await import('./instanceRows.js');

test('resolveTool resolves every supported tool slug to a valid table entry', () => {
  for (const slug of ['characters', 'gmboard', 'encounters', 'dmscreen']) {
    const meta = resolveTool(slug);
    assert.ok(meta, `expected a tool for slug "${slug}"`);
    assert.equal(meta.slug, slug);
    assert.ok(REGISTRY_META[meta.registryKey], `registry meta missing for ${meta.registryKey}`);
    assert.equal(typeof meta.newRoute, 'string');
    assert.ok(meta.newRoute.length > 0);
    assert.equal(typeof meta.route('some-id'), 'string');
    assert.ok(meta.route('some-id').length > 0);
  }
  assert.equal(Object.keys(LIBRARY_TOOLS).length, 4);
});

test('resolveTool returns null for an unknown slug', () => {
  assert.equal(resolveTool('does-not-exist'), null);
});

test('resolveTool returns null for Object.prototype keys instead of a prototype member', () => {
  for (const slug of ['constructor', '__proto__', 'toString', 'valueOf', 'hasOwnProperty']) {
    assert.equal(resolveTool(slug), null, `expected null for prototype key "${slug}"`);
  }
});

test('readRegistry reads populated entries', () => {
  localStorage.clear();
  localStorage.setItem('gb_encounter_registry', JSON.stringify([{ id: 'e1', name: 'X', updatedAt: 5 }]));
  assert.deepEqual(readRegistry('gb_encounter_registry'), [{ id: 'e1', name: 'X', updatedAt: 5 }]);
});

test('readRegistry returns an empty array when the key is missing', () => {
  localStorage.clear();
  assert.deepEqual(readRegistry('gb_board_registry'), []);
});

test('readRegistry falls back to an empty array for a corrupt payload', () => {
  localStorage.clear();
  localStorage.setItem('gb_board_registry', '{not json');
  assert.deepEqual(readRegistry('gb_board_registry'), []);
});

test('readRegistry is uncapped by default, and delete/rename write back the full list', () => {
  localStorage.clear();
  const entries = Array.from({ length: 12 }, (_, i) => ({ id: `b${i}`, name: `Board ${i}`, updatedAt: i }));
  localStorage.setItem('gb_board_registry', JSON.stringify(entries));

  assert.equal(readRegistry('gb_board_registry').length, 12);

  renameRegistryEntry('gb_board_registry', 'b11', 'Renamed 11');
  const afterRename = JSON.parse(localStorage.getItem('gb_board_registry'));
  assert.equal(afterRename.length, 12);
  assert.equal(afterRename.find((e) => e.id === 'b11').name, 'Renamed 11');

  deleteRegistryEntry('gb_board_registry', 'b0');
  const afterDelete = JSON.parse(localStorage.getItem('gb_board_registry'));
  assert.equal(afterDelete.length, 11);
  assert.ok(afterDelete.some((e) => e.id === 'b11'));
});

test('readRegistry(key, { limit }) caps the result when a limit is explicitly requested', () => {
  localStorage.clear();
  const entries = Array.from({ length: 5 }, (_, i) => ({ id: `b${i}`, name: `Board ${i}`, updatedAt: i }));
  localStorage.setItem('gb_board_registry', JSON.stringify(entries));
  assert.equal(readRegistry('gb_board_registry', { limit: 2 }).length, 2);
});

test('deleteRegistryEntry removes scoped keys and the active id, leaving other tools untouched', () => {
  localStorage.clear();
  localStorage.setItem('gb_board_registry', JSON.stringify([{ id: 'b1', name: 'Board 1', updatedAt: 1 }]));
  localStorage.setItem('gb:board:b1:state:v1', '{}');
  localStorage.setItem('gb:board:b1:tables:v1', '{}');
  localStorage.setItem('gb_active_board_id', 'b1');
  localStorage.setItem('gb_encounter_registry', JSON.stringify([{ id: 'e1', name: 'Enc 1', updatedAt: 1 }]));
  localStorage.setItem('gb:enc:e1:party:v1', '{}');

  const ok = deleteRegistryEntry('gb_board_registry', 'b1');
  assert.equal(ok, true);
  assert.equal(localStorage.getItem('gb:board:b1:state:v1'), null);
  assert.equal(localStorage.getItem('gb:board:b1:tables:v1'), null);
  assert.equal(localStorage.getItem('gb_active_board_id'), null);
  assert.deepEqual(JSON.parse(localStorage.getItem('gb_board_registry')), []);
  assert.equal(localStorage.getItem('gb:enc:e1:party:v1'), '{}');
  assert.equal(JSON.parse(localStorage.getItem('gb_encounter_registry')).length, 1);
});

test('renameRegistryEntry updates only the target entry', () => {
  localStorage.clear();
  localStorage.setItem('gb_board_registry', JSON.stringify([
    { id: 'b1', name: 'A', updatedAt: 1 },
    { id: 'b2', name: 'B', updatedAt: 2 },
  ]));
  const ok = renameRegistryEntry('gb_board_registry', 'b1', 'Renamed');
  assert.equal(ok, true);
  const list = JSON.parse(localStorage.getItem('gb_board_registry'));
  assert.equal(list.find((e) => e.id === 'b1').name, 'Renamed');
  assert.equal(list.find((e) => e.id === 'b2').name, 'B');
});

test('mergeCharacterRows keeps local-only and cloud-only rows with the right origin', () => {
  const cloud = [{ id: 'c1', name: 'Cloud Char', owner: 'u1', owner_username: 'gm', updated_at: '2024-01-02T00:00:00.000Z' }];
  const local = [{ id: 'l1', name: 'Local Char', updatedAt: 100 }];
  const rows = mergeCharacterRows(cloud, local);
  assert.equal(rows.length, 2);
  assert.equal(rows.find((r) => r.id === 'c1').origin, 'cloud');
  assert.equal(rows.find((r) => r.id === 'l1').origin, 'local');
});

test('mergeCharacterRows collapses a sheet present in both sources into one cloud-origin row', () => {
  const cloud = [{ id: 'x1', name: 'Cloud Name', owner: 'u1', updated_at: '2024-05-01T00:00:00.000Z' }];
  const local = [{ id: 'x1', name: 'Local Name', updatedAt: 1 }];
  const rows = mergeCharacterRows(cloud, local);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].origin, 'cloud');
  assert.equal(rows[0].name, 'Cloud Name');
  assert.equal(rows[0].updatedAt, Date.parse('2024-05-01T00:00:00.000Z'));
  assert.equal(rows[0].hasLocal, true);
});

test('mergeCharacterRows keeps the local updatedAt distinct from the cloud-wins display updatedAt', () => {
  const cloud = [{ id: 'x1', name: 'Cloud Name', owner: 'u1', updated_at: '2024-05-01T00:00:00.000Z' }];
  const local = [{ id: 'x1', name: 'Local Name', updatedAt: 1 }];
  const rows = mergeCharacterRows(cloud, local);
  assert.equal(rows[0].localUpdatedAt, 1);
  assert.notEqual(rows[0].localUpdatedAt, rows[0].updatedAt);
});

test('mergeCharacterRows reports localUpdatedAt 0 and hasLocal false for a cloud-only row', () => {
  const rows = mergeCharacterRows([{ id: 'c1', name: 'C', updated_at: '2024-01-01T00:00:00.000Z' }], []);
  assert.equal(rows[0].hasLocal, false);
  assert.equal(rows[0].localUpdatedAt, 0);
});

test('mergeCharacterRows handles empty cloud, empty local, and both empty', () => {
  assert.deepEqual(mergeCharacterRows([], [{ id: 'l1', name: 'L', updatedAt: 1 }]).map((r) => r.id), ['l1']);
  assert.deepEqual(mergeCharacterRows([{ id: 'c1', name: 'C', updated_at: '2024-01-01T00:00:00.000Z' }], []).map((r) => r.id), ['c1']);
  assert.deepEqual(mergeCharacterRows([], []), []);
});

test('loadCharacterRows falls back to the full local list when the cloud call rejects', async () => {
  const local = [{ id: 'l1', name: 'L', updatedAt: 1 }, { id: 'l2', name: 'L2', updatedAt: 2 }];
  const { rows, error } = await loadCharacterRows({
    listCloud: async () => { throw new Error('offline'); },
    listLocal: () => local,
  });
  assert.equal(rows.length, 2);
  assert.deepEqual(rows.map((r) => r.id).sort(), ['l1', 'l2']);
  assert.ok(error);
});

test('deletePlanFor routes local, own-cloud, and foreign-cloud-as-GM correctly', () => {
  const localRow = { id: 'l1', name: 'L', origin: 'local' };
  const ownRow = { id: 'c1', name: 'C', origin: 'cloud', owner: 'me' };
  const foreignRow = { id: 'c2', name: 'F', origin: 'cloud', owner: 'other', ownerUsername: 'bob' };

  const localPlan = deletePlanFor(localRow, { myId: 'me', isGm: false });
  assert.equal(localPlan.cloud, null);
  assert.equal(localPlan.local, true);

  const ownPlan = deletePlanFor(ownRow, { myId: 'me', isGm: false });
  assert.equal(ownPlan.cloud, 'own');
  assert.equal(ownPlan.local, true);

  const gmPlan = deletePlanFor(foreignRow, { myId: 'me', isGm: true });
  assert.equal(gmPlan.cloud, 'any');
  assert.equal(gmPlan.local, false);
  assert.match(gmPlan.confirmMessage, /bob/);

  const deniedPlan = deletePlanFor(foreignRow, { myId: 'me', isGm: false });
  assert.equal(deniedPlan.cloud, null);
  assert.equal(deniedPlan.local, false);
  assert.equal(deniedPlan.confirmMessage, null);
});

test('canDeleteRow denies a non-GM acting on a sheet they do not own', () => {
  const foreignRow = { id: 'c2', name: 'F', origin: 'cloud', owner: 'other' };
  assert.equal(canDeleteRow(foreignRow, { myId: 'me', isGm: false }), false);
  assert.equal(canDeleteRow(foreignRow, { myId: 'me', isGm: true }), true);
  assert.equal(canDeleteRow({ id: 'l1', origin: 'local' }, { myId: 'me', isGm: false }), true);
});

test('freshness pulls only when valid cloud metadata is strictly newer', () => {
  const local = Date.parse('2026-08-01T10:00:00.000Z');
  assert.equal(shouldPullCloudCopy(local, { updated_at: '2026-08-01T10:00:00.001Z' }), true);
  assert.equal(shouldPullCloudCopy(local, { updated_at: '2026-08-01T09:59:59.999Z' }), false);
  assert.equal(shouldPullCloudCopy(local, { updated_at: '2026-08-01T10:00:00.000Z' }), false);
  assert.equal(shouldPullCloudCopy(local, null), false);
  assert.equal(shouldPullCloudCopy(local, {}), false);
  assert.equal(shouldPullCloudCopy(local, { updated_at: 'invalid' }), false);
});

test('section picker merge covers local-only, cloud-only, and collision with cloud winning', () => {
  const rows = mergeInstanceRows(
    [
      { id: 'cloud', name: 'Cloud only', updated_at: '2026-01-01T00:00:00Z' },
      { id: 'both', name: 'Cloud wins', updated_at: '2026-01-02T00:00:00Z' },
    ],
    [
      { id: 'local', name: 'Local only', updatedAt: 1 },
      { id: 'both', name: 'Local loses', updatedAt: 2 },
    ],
  );
  assert.equal(rows.length, 3);
  assert.equal(rows.find((row) => row.id === 'local').origin, 'local');
  assert.equal(rows.find((row) => row.id === 'cloud').origin, 'cloud');
  assert.equal(rows.find((row) => row.id === 'both').name, 'Cloud wins');
  assert.equal(rows.filter((row) => row.id === 'both').length, 1);
});

test('failing section cloud list keeps full local list and returns notice', async () => {
  const local = [{ id: 'one', updatedAt: 1 }, { id: 'two', updatedAt: 2 }];
  const result = await loadInstanceRows({
    listLocal: () => local,
    listCloud: async () => { throw new Error('offline'); },
  });
  assert.deepEqual(result.rows.map((row) => row.id).sort(), ['one', 'two']);
  assert.equal(result.error, 'offline');
});

test('section delete plan never sends local-only deletion to cloud', () => {
  const local = sectionDeletePlan({ id: 'l1', name: 'Local', origin: 'local' });
  const cloud = sectionDeletePlan({ id: 'c1', name: 'Cloud', origin: 'cloud' });
  assert.deepEqual({ cloud: local.cloud, local: local.local }, { cloud: false, local: true });
  assert.deepEqual({ cloud: cloud.cloud, local: cloud.local }, { cloud: true, local: true });
});
