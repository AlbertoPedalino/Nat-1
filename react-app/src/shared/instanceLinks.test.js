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

const {
  mergeLinkedInstanceRows,
  normalizeLinkGroupId,
  resolveGroupMerge,
  setLocalInstanceLink,
} = await import('./instanceLinks.js');
const { createSectionInstance } = await import('./sectionInstances.js');
const gmBoardStorage = await import('../pages/gmboard/storage.js');
const encounterStorage = await import('../pages/encounterbuilder/logic/storage.js');
const dmScreenStorage = await import('../pages/dmscreen/storage.js');

test('link group ids are explicit safe identifiers, never instance names', () => {
  assert.equal(normalizeLinkGroupId('link_abc-123'), 'link_abc-123');
  assert.equal(normalizeLinkGroupId('Session One'), null);
  assert.equal(normalizeLinkGroupId('../other'), null);
});

test('local linking preserves instance metadata and writes the group', () => {
  localStorage.clear();
  localStorage.setItem('gb_board_registry', JSON.stringify([{
    id: 'board-a', name: 'Board A', updatedAt: 1, custom: 'kept',
  }]));

  const entry = setLocalInstanceLink('gmboard', 'board-a', 'link_party', { emit: false });

  assert.equal(entry.linkGroupId, 'link_party');
  assert.equal(entry.custom, 'kept');
  assert.equal(JSON.parse(localStorage.getItem('gb_board_registry'))[0].linkGroupId, 'link_party');
});

test('cloud metadata wins while local availability remains visible', () => {
  const rows = mergeLinkedInstanceRows('gmboard', [{
    id: 'board-a', name: 'Cloud', link_group_id: 'link_cloud', updated_at: '2026-01-01T00:00:00Z',
  }], [{ id: 'board-a', name: 'Local', linkGroupId: 'link_local', updatedAt: 1 }]);
  assert.equal(rows[0].name, 'Cloud');
  assert.equal(rows[0].linkGroupId, 'link_cloud');
  assert.equal(rows[0].hasLocal, true);
  assert.equal(rows[0].origin, 'cloud');
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

test('a linked instance is created already registered with its group', () => {
  localStorage.clear();
  const entry = createSectionInstance('dmscreen', { linkGroupId: 'link_party' });
  assert.equal(entry.linkGroupId, 'link_party');
  assert.equal(dmScreenStorage.resolveInstance(`?screen=${entry.id}`).linkGroupId, 'link_party');
});

// Legacy `?x=new&linkGroup=` URLs (bookmarks, older links) still have to carry
// the group through: creation now happens before navigation, but the tool pages
// remain the fallback that saves whatever arrives unregistered.
test('every tool carries a linked group through creation routing', () => {
  localStorage.clear();
  const board = gmBoardStorage.resolveInstance('?board=new&linkGroup=link_party');
  const encounter = encounterStorage.resolveInstance('?enc=new&linkGroup=link_party');
  const screen = dmScreenStorage.resolveInstance('?screen=new&linkGroup=link_party', () => 'screen-new');
  assert.equal(board.linkGroupId, 'link_party');
  assert.match(board.replaceSearch, /linkGroup=link_party/);
  assert.equal(encounter.linkGroupId, 'link_party');
  assert.match(encounter.replaceSearch, /linkGroup=link_party/);
  assert.equal(screen.linkGroupId, 'link_party');
});
