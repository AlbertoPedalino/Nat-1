import test from 'node:test';
import assert from 'node:assert/strict';
import { ROLL_TONES, attackRollerToneSx, rollerToneSx } from './entityColors.js';

test('a roll-button tint is its tone plus a translucent border of the same hue', () => {
  const sx = rollerToneSx(ROLL_TONES.damage);
  assert.equal(sx.color, ROLL_TONES.damage);
  assert.equal(sx.borderColor, 'rgba(255, 107, 53, 0.4)');
});

test('an ordinary attack roll is tinted with the default blue', () => {
  assert.deepEqual(attackRollerToneSx(), rollerToneSx(ROLL_TONES.attack));
  assert.deepEqual(attackRollerToneSx({}), rollerToneSx(ROLL_TONES.attack));
});

test('a not-proficient attack is tinted red', () => {
  assert.deepEqual(
    attackRollerToneSx({ notProficient: true }),
    rollerToneSx(ROLL_TONES.attackNotProficient),
  );
});

test('disadvantage outranks not-proficient', () => {
  // The red only annotates the bonus; disadvantage changes how the die is
  // rolled, so it must win when both apply.
  assert.deepEqual(
    attackRollerToneSx({ disadv: true, notProficient: true }),
    rollerToneSx(ROLL_TONES.attackDisadvantage),
  );
  assert.notDeepEqual(
    attackRollerToneSx({ disadv: true, notProficient: true }),
    attackRollerToneSx({ notProficient: true }),
  );
});
