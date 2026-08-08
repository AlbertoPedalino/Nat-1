import test from 'node:test';
import assert from 'node:assert/strict';
import { DICE_LIMITS, parseFormula, rollFormula } from './dice.js';

test('strict formulas preserve supported whitespace, omitted counts, signs, and modifiers', () => {
  const parsed = parseFormula(' 2d6 + d20 - 3 - 1d4 ');

  assert.equal(parsed.valid, true);
  assert.equal(parsed.modifier, -3);
  assert.deepEqual(parsed.dice, [
    { faces: 6, sign: 1 },
    { faces: 6, sign: 1 },
    { faces: 20, sign: 1 },
    { faces: 4, sign: -1 },
  ]);
});

test('a flat integer remains a valid formula but contains no dice', () => {
  assert.deepEqual(parseFormula('+3'), {
    valid: true,
    error: null,
    dice: [],
    modifier: 3,
  });
});

test('unsupported or partial notation fails as a whole instead of being scanned for numbers', () => {
  for (const formula of ['2d6garbage999', '2d6++3', '2d6+', '2dd6', '(2d6)+3']) {
    const parsed = parseFormula(formula);
    assert.equal(parsed.valid, false, formula);
    assert.equal(parsed.error.code, 'INVALID_SYNTAX', formula);
    assert.deepEqual(parsed.dice, [], formula);
  }
});

test('formula validation bounds dice count, faces, modifiers, and source length', () => {
  const cases = [
    ['0d6', 'INVALID_DIE_COUNT'],
    [`${DICE_LIMITS.maxDice + 1}d6`, 'DICE_COUNT_OUT_OF_RANGE'],
    [`${DICE_LIMITS.maxDice}d6+1d4`, 'DICE_COUNT_OUT_OF_RANGE'],
    [`1d${DICE_LIMITS.minFaces - 1}`, 'INVALID_DIE_FACES'],
    [`1d${DICE_LIMITS.maxFaces + 1}`, 'INVALID_DIE_FACES'],
    [`1d6+${DICE_LIMITS.modifierAbs + 1}`, 'MODIFIER_OUT_OF_RANGE'],
    [' '.repeat(DICE_LIMITS.formulaLength + 1), 'FORMULA_TOO_LONG'],
  ];

  for (const [formula, code] of cases) {
    const parsed = parseFormula(formula);
    assert.equal(parsed.valid, false, formula);
    assert.equal(parsed.error.code, code, formula);
    assert.deepEqual(parsed.dice, [], formula);
  }

  assert.equal(parseFormula(`${DICE_LIMITS.maxDice}d6`).dice.length, DICE_LIMITS.maxDice);
});

test('an invalid roll returns a structured non-result', () => {
  const result = rollFormula('2d6not-a-formula');
  assert.equal(result.valid, false);
  assert.equal(result.total, null);
  assert.deepEqual(result.rolls, []);
  assert.equal(result.error.code, 'INVALID_SYNTAX');
});
