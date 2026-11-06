import test from 'node:test';
import assert from 'node:assert/strict';
import { parseRollTable, rollOnTable } from '../../../../../src/shared/character/dice/rollTables.js';

const surge = {
  type: 'table',
  caption: 'Wild Magic Surge',
  colLabels: ['{@dice 1d100}', 'Effect'],
  rows: [
    ['01–04', 'Roll on this table at the start of each of your turns.'],
    ['05–96', 'You cast {@spell Fireball|XPHB} centered on yourself.'],
    ['97–00', 'Roll {@dice 1d6}.'],
  ],
};

test('a 5etools roll table reads its die, ranges (00 is 100) and plain effect text', () => {
  const table = parseRollTable('Wild Magic Surge', surge);
  assert.equal(table.name, 'Wild Magic Surge Table');
  assert.equal(table.sides, 100);
  assert.deepEqual(table.rows.map((row) => [row.low, row.high]), [[1, 4], [5, 96], [97, 100]]);
  assert.equal(table.rows[1].effect, 'You cast Fireball centered on yourself.');
});

test('a roll lands on the row whose range holds it', () => {
  const table = parseRollTable('Wild Magic Surge', surge);
  const { rolls } = rollOnTable(table, { count: 2, rng: (() => { const v = [0, 0.999]; let i = 0; return () => v[i++]; })() });
  assert.deepEqual(rolls.map((roll) => [roll.value, roll.range]), [[1, '01–04'], [100, '97–00']]);
});
