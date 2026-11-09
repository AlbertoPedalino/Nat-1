import test from 'node:test';
import assert from 'node:assert/strict';
import { DAMAGE_TYPE_COLORS, ROLL_TONES, attackRollerToneSx, damageTypeTone, rollerToneSx } from '../../../../src/shared/ui/entityColors.js';
import { UI_COLORS } from '../../../../src/shared/ui/colors.js';

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

test('a defense label takes the hue of the damage type it names', () => {
  assert.equal(damageTypeTone('Fire'), DAMAGE_TYPE_COLORS.fire);
  assert.equal(damageTypeTone('cold'), DAMAGE_TYPE_COLORS.cold);
  assert.equal(damageTypeTone('Bludgeoning (nonmagical)'), DAMAGE_TYPE_COLORS.bludgeoning);
  assert.equal(damageTypeTone('All damage'), UI_COLORS.accentText);
});

test('a label naming no damage type has no hue', () => {
  assert.equal(damageTypeTone('Frightened'), null);
  assert.equal(damageTypeTone(''), null);
  assert.equal(damageTypeTone(undefined), null);
  // Whole words only: "all" inside another word is not "All damage".
  assert.equal(damageTypeTone('Small creatures'), null);
});
