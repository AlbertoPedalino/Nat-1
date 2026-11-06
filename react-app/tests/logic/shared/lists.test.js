import test from 'node:test';
import assert from 'node:assert/strict';
import { asArray, flattenList } from '../../../src/shared/lists.js';
import { numberOr } from '../../../src/shared/numbers.js';

test('asArray: a list as is, one value as a list, nothing as empty', () => {
  const list = ['a'];
  assert.equal(asArray(list), list);
  assert.deepEqual(asArray('a'), ['a']);
  assert.deepEqual(asArray(0), [0]);
  assert.deepEqual(asArray(null), []);
  assert.deepEqual(asArray(undefined), []);
});

test('flattenList opens nested lists and Sets', () => {
  assert.deepEqual(flattenList(['a', ['b', new Set(['c', ['d']])], null]), ['a', 'b', 'c', 'd']);
  assert.deepEqual(flattenList('a'), ['a']);
  assert.deepEqual(flattenList(undefined), []);
});

test('numberOr reads a finite number or gives the fallback', () => {
  assert.equal(numberOr('7'), 7);
  assert.equal(numberOr('x'), 0);
  assert.equal(numberOr(Infinity, 3), 3);
  assert.equal(numberOr(undefined, null), null);
});
