import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { parseFormula, rollD20, rollFormula, rollPool } from '../../../../../src/shared/character/dice/dice.js';
import { rollDice, rollDiceFormula } from '../../../../../src/shared/character/dice/rollNotation.js';

const seq = (...values) => { let i = 0; return () => values[i++ % values.length]; };

test('every roller takes the same rng: pool, d20 test, formula and notation', () => {
  assert.deepEqual(rollPool(3, 6, seq(0, 0.5, 0.99)), [1, 4, 6]);
  assert.deepEqual(rollD20(2, { advantage: true, rng: seq(0.5, 0.2) }), {
    mode: 'advantage', kept: 11, bonus: 2, total: 13,
    rolls: [{ v: 11, faces: 20, kept: true }, { v: 5, faces: 20, kept: false }],
  });
  assert.equal(rollFormula('2d6+3', { rng: seq(0) }).total, 5);
  assert.equal(rollDiceFormula('1d20-2d4+1', seq(0.95, 0, 0)).mathStr, '1d20 [20] - 2d4 [1, 1] + 1');
});

test('notation obeys the same limits as the sheet: a formula the engine refuses is null', () => {
  assert.equal(parseFormula('200d6').valid, false);
  assert.equal(rollDiceFormula('200d6'), null);
  assert.equal(rollDice('1d1', 'Roll'), null);
  assert.equal(rollDice('2d6garbage', 'Roll'), null);
});

// No die is rolled outside the engine: any other Math.random in the source is
// an id, a seed or a pick from a list, never `* faces`.
test('no file rolls a die by hand', () => {
  const root = new URL('../../../../../src/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
  const engine = join(root, 'shared/character/dice/dice.js');
  const offenders = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) { if (name !== 'data') walk(path); continue; }
      if (!/\.(js|jsx)$/.test(name) || path === engine) continue;
      const text = readFileSync(path, 'utf8');
      if (/Math\.floor\(\s*(Math\.random|rng)\(\)\s*\*\s*(\d+|[\w.]*(faces|sides)[\w.]*)\s*\)\s*\+\s*1/.test(text)) {
        offenders.push(relative(root, path));
      }
    }
  };
  walk(root);
  assert.deepEqual(offenders, []);
});
