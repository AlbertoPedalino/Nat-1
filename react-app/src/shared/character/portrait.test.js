import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PORTRAIT_MAX_BYTES,
  forgetPortrait,
  isSupportedPortrait,
  portraitPath,
  prunePortraits,
  readPortrait,
  writePortrait,
} from './portrait.js';

// Enough of localStorage to test against, including the parts that make pruning
// possible: it is enumerable and it can run out of room.
function fakeStore({ limit = Infinity } = {}) {
  const entries = new Map();
  return {
    get length() { return entries.size; },
    key: (index) => [...entries.keys()][index] ?? null,
    getItem: (key) => (entries.has(key) ? entries.get(key) : null),
    removeItem: (key) => { entries.delete(key); },
    setItem: (key, value) => {
      if (!entries.has(key) && entries.size >= limit) throw new Error('QuotaExceededError');
      entries.set(key, value);
    },
    entries,
  };
}

test('a portrait is filed under its owner, and never at the same address twice', () => {
  const first = portraitPath('user-1', 'char-1', 1000);
  const second = portraitPath('user-1', 'char-1', 2000);
  assert.ok(first.startsWith('user-1/'), 'the owner comes first, which is what storage policies key on');
  assert.notEqual(first, second, 'a new picture is a new address, so nothing cached can be stale');
  assert.equal(portraitPath(null, 'char-1'), null);
  assert.equal(portraitPath('user-1', null), null);
});

test('only pictures, and only ones worth uploading', () => {
  assert.equal(isSupportedPortrait({ type: 'image/png', size: 2048 }), true);
  assert.equal(isSupportedPortrait({ type: 'image/webp', size: 2048 }), true);
  assert.equal(isSupportedPortrait({ type: 'application/pdf', size: 2048 }), false);
  assert.equal(isSupportedPortrait({ type: 'image/png', size: 0 }), false);
  assert.equal(isSupportedPortrait({ type: 'image/png', size: PORTRAIT_MAX_BYTES + 1 }), false);
  assert.equal(isSupportedPortrait(null), false);
});

test('a portrait read back is the one that was kept', () => {
  const store = fakeStore();
  writePortrait('user-1/char-1.webp', 'data:image/webp;base64,AAA', store);
  assert.equal(readPortrait('user-1/char-1.webp', store), 'data:image/webp;base64,AAA');
  forgetPortrait('user-1/char-1.webp', store);
  assert.equal(readPortrait('user-1/char-1.webp', store), null);
});

test('nothing kept means nothing read, and no exception either', () => {
  assert.equal(readPortrait('missing', fakeStore()), null);
  assert.equal(readPortrait(null, fakeStore()), null);
  // Storage can be denied outright by the browser.
  assert.equal(readPortrait('any', null), null);
  assert.equal(writePortrait('any', 'data:...', null), false);
});

// Otherwise a long campaign fills the origin's whole allowance with the faces
// of characters nobody is playing any more.
test('the cache is capped, and the oldest go first', () => {
  const store = fakeStore();
  for (let index = 0; index < 40; index += 1) {
    writePortrait(`user-1/char-${index}.webp`, `data:${index}`, store);
  }
  assert.ok(store.length <= 24, `${store.length} portraits kept`);
  assert.equal(readPortrait('user-1/char-0.webp', store), null, 'the first one went');
  assert.equal(readPortrait('user-1/char-39.webp', store), 'data:39', 'the newest stayed');
});

test('a full store is emptied out enough to fit the new one', () => {
  const store = fakeStore({ limit: 5 });
  for (let index = 0; index < 5; index += 1) {
    writePortrait(`user-1/char-${index}.webp`, `data:${index}`, store);
  }
  assert.equal(writePortrait('user-1/latest.webp', 'data:new', store), true);
  assert.equal(readPortrait('user-1/latest.webp', store), 'data:new');
});

test('pruning leaves everything else in the store alone', () => {
  const store = fakeStore();
  store.setItem('gb:something-else', 'keep me');
  for (let index = 0; index < 40; index += 1) {
    writePortrait(`user-1/char-${index}.webp`, `data:${index}`, store);
  }
  prunePortraits(store, 1);
  assert.equal(store.getItem('gb:something-else'), 'keep me');
});
