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

const { createSectionInstance, makeSectionInstanceId } = await import('./sectionInstances.js');
const { SECTION_KEYS, SECTION_REGISTRY } = await import('./sectionRegistry.js');
const gmBoardStorage = await import('../pages/gmboard/storage.js');
const encounterStorage = await import('../pages/encounterbuilder/logic/storage.js');
const dmScreenStorage = await import('../pages/dmscreen/storage.js');

test('creating an instance registers it locally and makes it the active one', () => {
  for (const sectionKey of SECTION_KEYS) {
    localStorage.clear();
    const section = SECTION_REGISTRY[sectionKey];
    const entry = createSectionInstance(sectionKey);

    assert.ok(entry, `expected an entry for ${sectionKey}`);
    assert.equal(entry.name, section.defaultName(entry.id));
    assert.deepEqual(JSON.parse(localStorage.getItem(section.registryKey)), [entry]);
    assert.equal(localStorage.getItem(section.activeKey), entry.id);
  }
});

// The tool pages resolve `saved` from their own id sanitizer + registry lookup,
// so a picker-minted id has to survive that round trip untouched.
test('minted ids are accepted as saved instances by each tool page resolver', () => {
  const resolvers = {
    gmboard: { param: 'board', resolve: gmBoardStorage.resolveInstance },
    encounters: { param: 'enc', resolve: encounterStorage.resolveInstance },
    dmscreen: { param: 'screen', resolve: dmScreenStorage.resolveInstance },
  };

  for (const sectionKey of SECTION_KEYS) {
    localStorage.clear();
    const { param, resolve } = resolvers[sectionKey];
    const entry = createSectionInstance(sectionKey, { name: 'Session One' });
    const resolved = resolve(`?${param}=${entry.id}`);

    assert.equal(resolved.id, entry.id);
    assert.equal(resolved.saved, true, `${sectionKey} should open as saved`);
    assert.equal(entry.name, 'Session One');
  }
});

test('a link group given at creation is stored on the entry', () => {
  localStorage.clear();
  const entry = createSectionInstance('dmscreen', { linkGroupId: 'link_party' });
  assert.equal(entry.linkGroupId, 'link_party');

  localStorage.clear();
  const unlinked = createSectionInstance('dmscreen', { linkGroupId: 'Session One' });
  assert.equal(unlinked.linkGroupId, undefined);
});

test('ids are unique per call and namespaced per section', () => {
  const ids = new Set();
  for (const sectionKey of SECTION_KEYS) {
    const prefix = `${SECTION_REGISTRY[sectionKey].idPrefix}_`;
    for (let index = 0; index < 50; index += 1) {
      const id = makeSectionInstanceId(sectionKey);
      assert.ok(id.startsWith(prefix), `${id} should start with ${prefix}`);
      ids.add(id);
    }
  }
  assert.equal(ids.size, SECTION_KEYS.length * 50);
});

test('an unknown section creates nothing', () => {
  localStorage.clear();
  assert.equal(createSectionInstance('nope'), null);
  assert.equal(makeSectionInstanceId('nope'), '');
  assert.equal(localStorage.length, 0);
});

test('a failed registry write reports failure instead of a half-created instance', () => {
  localStorage.clear();
  const section = SECTION_REGISTRY.gmboard;
  const original = localStorage.setItem;
  localStorage.setItem = function setItem(key, value) {
    if (key === section.activeKey) throw new Error('quota');
    return original.call(this, key, value);
  };
  try {
    assert.equal(createSectionInstance('gmboard'), null);
  } finally {
    localStorage.setItem = original;
  }
  assert.equal(localStorage.getItem(section.registryKey), null, 'registry write must be rolled back');
});
