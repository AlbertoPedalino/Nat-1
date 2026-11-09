import test from 'node:test';
import assert from 'node:assert/strict';
import { DICE_LIMITS } from '../../../../../src/shared/character/dice/dice.js';
import { rollCustomFormula } from '../../../../../src/shared/character/dice/customRoll.js';

const seq = (...values) => { let i = 0; return () => values[i++ % values.length]; };

test('a formula becomes the dice it asks for, rolled by the engine', () => {
  const result = rollCustomFormula('2d6+1d20+3', { rng: seq(0, 0.5, 0.99) });
  assert.deepEqual(result.rolls, [{ v: 1, faces: 6 }, { v: 4, faces: 6 }, { v: 20, faces: 20 }]);
  assert.equal(result.total, 28);
  assert.equal(result.modifier, 3);
  assert.equal(result.detail, '2d6+1d20+3');
});

test('a subtracted die is taken off the total', () => {
  const result = rollCustomFormula('1d6-1d4', { rng: seq(0.99, 0) });
  assert.equal(result.total, 6 - 1);
});

test('a large pool counts every die', () => {
  const result = rollCustomFormula('40d6');
  assert.equal(result.rolls.length, 40);
  assert.equal(result.total, result.rolls.reduce((acc, die) => acc + die.v, 0));
});

test('a coin comes up heads or tails, not one or two', () => {
  assert.match(rollCustomFormula('1d2').detail, /^1d2 \((Heads|Tails)\)$/);
  assert.match(rollCustomFormula('2d2').detail, /\((Heads|Tails), (Heads|Tails)\)/);
});

test('a formula with no dice is not a throw', () => {
  assert.equal(rollCustomFormula('+3'), null);
  assert.equal(rollCustomFormula(''), null);
  assert.equal(rollCustomFormula('2d6garbage999'), null);
  assert.equal(rollCustomFormula(`${DICE_LIMITS.maxDice + 1}d6`), null);
});
