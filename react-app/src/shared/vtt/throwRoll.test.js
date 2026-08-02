import test from 'node:test';
import assert from 'node:assert/strict';
import { MAX_THROWN_DICE } from './dicePhysics.js';
import { throwFormula } from './throwRoll.js';

test('a formula becomes the dice it asks for', () => {
  const result = throwFormula('2d6+1d20+3', 'roll-1');
  assert.deepEqual(result.rolls.map((die) => die.faces), [6, 6, 20]);
});

test('every die shows a number it could actually show', () => {
  for (const faces of [4, 6, 8, 10, 12, 20]) {
    for (const die of throwFormula(`3d${faces}`, `roll-d${faces}`).rolls) {
      assert.ok(die.v >= 1 && die.v <= faces, `a d${faces} showed ${die.v}`);
      assert.equal(Number.isInteger(die.v), true);
    }
  }
});

test('the total is the dice that landed plus the modifier', () => {
  const result = throwFormula('3d8+5', 'roll-2');
  const sum = result.rolls.reduce((acc, die) => acc + die.v, 0);
  assert.equal(result.total, sum + 5);
  assert.equal(result.modifier, 5);
});

test('a subtracted die is taken off the total', () => {
  const result = throwFormula('1d6-1d4', 'roll-3');
  assert.equal(result.total, result.rolls[0].v - result.rolls[1].v);
});

// The roller publishes a total; everyone else re-throws the same dice to show
// it landing. If the two ever disagreed, the table would be reading a different
// roll from the one in the log.
test('the same roll gives the same result to everyone', () => {
  assert.deepEqual(throwFormula('4d6+2', 'roll-4'), throwFormula('4d6+2', 'roll-4'));
});

test('two rolls of the same formula are different rolls', () => {
  assert.notDeepEqual(
    throwFormula('4d6', 'roll-5').rolls,
    throwFormula('4d6', 'roll-6').rolls,
  );
});

// Over many throws a die has to use its whole range, or the physics is quietly
// favouring the faces that happen to land easily.
test('a die uses its whole range', () => {
  const seen = new Set();
  for (let index = 0; index < 40; index += 1) {
    seen.add(throwFormula('1d6', `spread-${index}`).rolls[0].v);
  }
  assert.deepEqual([...seen].sort((a, b) => a - b), [1, 2, 3, 4, 5, 6]);
});

// Dice past the cap are never thrown, so they must not be counted either — and
// the line under the roll has to admit it rather than quietly rolling fewer.
test('a roll bigger than the tray says so', () => {
  const result = throwFormula('40d6', 'roll-7');
  assert.equal(result.rolls.length, MAX_THROWN_DICE);
  assert.equal(result.total, result.rolls.reduce((acc, die) => acc + die.v, 0));
  assert.match(result.detail, /first 12 dice/);
});

// A coin that came up 1 came up heads. The number still has to add up, but the
// line under the roll is for people to read.
test('a coin comes up heads or tails, not one or two', () => {
  const result = throwFormula('1d2', 'roll-coin');
  assert.ok([1, 2].includes(result.rolls[0].v), 'the arithmetic is unchanged');
  assert.match(result.detail, /\((Heads|Tails)\)/);
});

test('two coins each say which way up they are', () => {
  const result = throwFormula('2d2', 'roll-coins');
  assert.match(result.detail, /\((Heads|Tails), (Heads|Tails)\)/);
});

test('a formula with no dice is not a throw', () => {
  assert.equal(throwFormula('+3', 'roll-8'), null);
  assert.equal(throwFormula('', 'roll-8'), null);
});
