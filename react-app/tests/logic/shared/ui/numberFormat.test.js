import test from 'node:test';
import assert from 'node:assert/strict';
import { signed, withModifier } from '../../../../src/shared/ui/numberFormat.js';

test('a modifier always carries its sign; anything else reads as +0', () => {
  assert.deepEqual([3, -1, 0, '4', '-2'].map(signed), ['+3', '-1', '+0', '+4', '-2']);
  assert.deepEqual([undefined, null, 'abc'].map(signed), ['+0', '+0', '+0']);
});

test('a dice formula takes its modifier with the sign, and none when it is 0', () => {
  assert.equal(withModifier('2d8', 3), '2d8+3');
  assert.equal(withModifier('1d10', -1), '1d10-1');
  assert.equal(withModifier('1d4', 0), '1d4');
  assert.equal(withModifier('1d4', undefined), '1d4');
});
