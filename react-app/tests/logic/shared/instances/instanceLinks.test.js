import test from 'node:test';
import assert from 'node:assert/strict';

class MemoryStorage {
  setItem(key, value) { this[key] = String(value); }
  getItem(key) { return Object.prototype.hasOwnProperty.call(this, key) ? this[key] : null; }
  removeItem(key) { delete this[key]; }
  clear() { for (const key of Object.keys(this)) delete this[key]; }
  key(index) { return Object.keys(this)[index] ?? null; }
  get length() { return Object.keys(this).length; }
}

Object.defineProperty(globalThis, 'localStorage', { value: new MemoryStorage(), configurable: true });
if (!globalThis.window) globalThis.window = { dispatchEvent: () => true };

const {
  normalizeLinkGroupId,
  resolveGroupMerge,
  setLocalInstanceLink,
} = await import('../../../../src/shared/instances/instanceLinks.js');
const { createInstance, getInstance, listInstances } = await import('../../../../src/shared/instances/instanceStore.js');
const { mergeInstanceRows } = await import('../../../../src/shared/instances/instanceSync.js');

test('link group ids are explicit safe identifiers, never instance names', () => {
  assert.equal(normalizeLinkGroupId('link_abc-123'), 'link_abc-123');
  assert.equal(normalizeLinkGroupId('Session One'), null);
  assert.equal(normalizeLinkGroupId('../other'), null);
});

test('linking locally keeps the entry and marks the group for sync', () => {
  localStorage.clear();
  createInstance('gmboard', { id: 'board-a', name: 'Board A' });
  const entry = setLocalInstanceLink('gmboard', 'board-a', 'link_party');
  assert.equal(entry.linkGroupId, 'link_party');
  assert.equal(entry.name, 'Board A');
  assert.equal(entry.dirty.linkGroup, true);
  assert.equal(getInstance('gmboard', 'board-a').linkGroupId, 'link_party');
  assert.equal(setLocalInstanceLink('gmboard', 'missing', 'link_party'), null);
});

test('rows prefer cloud metadata unless this browser changed it and has not synced', () => {
  const cloudRows = [{ id: 'board-a', name: 'Cloud', link_group_id: 'link_cloud', updated_at: '2026-01-01T00:00:00Z' }];
  const clean = { id: 'board-a', name: 'Local', linkGroupId: 'link_local', updatedAt: 1, cloud: 'linked', dirty: { data: false, name: false, linkGroup: false } };
  let [row] = mergeInstanceRows('gmboard', cloudRows, [clean]);
  assert.equal(row.name, 'Cloud');
  assert.equal(row.linkGroupId, 'link_cloud');
  assert.equal(row.hasLocal, true);
  assert.equal(row.origin, 'cloud');

  [row] = mergeInstanceRows('gmboard', cloudRows, [{ ...clean, dirty: { data: false, name: true, linkGroup: true } }]);
  assert.equal(row.name, 'Local');
  assert.equal(row.linkGroupId, 'link_local');

  [row] = mergeInstanceRows('gmboard', [{ ...cloudRows[0], link_group_id: null }], [clean]);
  assert.equal(row.linkGroupId, null, 'an explicit cloud unlink does not inherit the old local group');
});

test('merging different groups moves every member of both groups', () => {
  const rows = [
    { sectionKey: 'gmboard', id: 'b', linkGroupId: 'link_one' },
    { sectionKey: 'dmscreen', id: 'd', linkGroupId: 'link_one' },
    { sectionKey: 'encounters', id: 'e', linkGroupId: 'link_two' },
    { sectionKey: 'gmboard', id: 'unrelated', linkGroupId: 'link_other' },
  ];
  const plan = resolveGroupMerge(rows[0], rows[2], rows);
  assert.equal(plan.groupId, 'link_one');
  assert.equal(plan.mergesGroups, true);
  assert.deepEqual(plan.members.map((row) => row.id).sort(), ['b', 'd', 'e']);
});

test('a linked instance is created with its group', () => {
  localStorage.clear();
  const entry = createInstance('dmscreen', { linkGroupId: 'link_party' });
  assert.equal(entry.linkGroupId, 'link_party');
  assert.equal(listInstances('dmscreen')[0].linkGroupId, 'link_party');
  assert.deepEqual(listInstances('encounters'), []);
});
