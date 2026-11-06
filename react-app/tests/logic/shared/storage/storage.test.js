import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clearAppLocalStorage, getStorageItem, getStorageJson, listStorageKeys, removeStorageItemStrict,
  setStorageItem, setStorageJson, writeStorageItemStrict,
} from '../../../../src/shared/storage/storage.js';

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

test('clearAppLocalStorage removes every gb:/gb_/5e_/gm_ key and leaves foreign keys', () => {
  localStorage.clear();
  localStorage.setItem('gb:char:1', '{}');
  localStorage.setItem('gb_char_registry', '[]');
  localStorage.setItem('5e_cache', '{}');
  localStorage.setItem('gm_note', '{}');
  localStorage.setItem('unrelated_app_key', 'keep me');

  const removed = clearAppLocalStorage();
  assert.equal(removed, 4);
  assert.equal(localStorage.getItem('gb:char:1'), null);
  assert.equal(localStorage.getItem('gb_char_registry'), null);
  assert.equal(localStorage.getItem('5e_cache'), null);
  assert.equal(localStorage.getItem('gm_note'), null);
  assert.equal(localStorage.getItem('unrelated_app_key'), 'keep me');
});

test('listStorageKeys returns the keys under a prefix', () => {
  localStorage.clear();
  localStorage.setItem('gb:board:1:state', 'a');
  localStorage.setItem('gb:board:2:state', 'b');
  localStorage.setItem('gb:chars', '[]');
  assert.deepEqual(listStorageKeys('gb:board:').sort(), ['gb:board:1:state', 'gb:board:2:state']);
});

test('a data write that does not fit throws; a preference write only forgets', () => {
  localStorage.clear();
  const setItem = localStorage.setItem;
  Object.defineProperty(localStorage, 'setItem', {
    configurable: true,
    value: () => { throw new Error('QuotaExceededError'); },
  });
  try {
    assert.throws(() => writeStorageItemStrict('gb:char:1', '{}'), /Quota/);
    assert.doesNotThrow(() => setStorageItem('gb:pref', '1'));
    assert.doesNotThrow(() => setStorageJson('gb:pref', { a: 1 }));
  } finally {
    delete localStorage.setItem;
    assert.equal(localStorage.setItem, setItem);
  }
  writeStorageItemStrict('gb:char:1', '{"name":"A"}');
  assert.deepEqual(getStorageJson('gb:char:1'), { name: 'A' });
  removeStorageItemStrict('gb:char:1');
  assert.equal(getStorageItem('gb:char:1'), null);
});
