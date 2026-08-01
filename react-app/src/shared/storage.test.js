import test from 'node:test';
import assert from 'node:assert/strict';
import { clearAppLocalStorage } from './storage.js';

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
