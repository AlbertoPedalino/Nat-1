import test from 'node:test';
import assert from 'node:assert/strict';
import {
  advArgFor, rollModeLabel, sourcesFromAdvArg, withExtraSource,
} from '../../../../../src/shared/character/dice/advantage.js';

test('sources fold into a roll argument: any of each is a straight roll', () => {
  assert.equal(advArgFor({ adv: true }), true);
  assert.equal(advArgFor({ disadv: true }), false);
  assert.equal(advArgFor({ adv: true, disadv: true }), undefined);
  assert.equal(advArgFor(), undefined);
});

// Vow of Enmity while Blinded: the extra advantage cancels the condition's
// disadvantage rather than overriding it.
test('a one-off source is added, never forced', () => {
  assert.equal(advArgFor(withExtraSource({ disadv: true }, 'adv')), undefined);
  assert.equal(advArgFor(withExtraSource({}, 'adv')), true);
  assert.equal(advArgFor(withExtraSource({ adv: true }, 'adv')), true);
  assert.equal(advArgFor(withExtraSource({ adv: true }, 'disadv')), undefined);
  assert.equal(advArgFor(withExtraSource(sourcesFromAdvArg(false), 'disadv')), false);
  assert.equal(rollModeLabel(undefined), 'Straight roll');
});
