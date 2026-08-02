import test from 'node:test';
import assert from 'node:assert/strict';
import { formatRollBonus, resolveToastLayout, rollDieColor } from './rollToastLayout.js';

test('the kept d20 decides the crit, not the one advantage threw away', () => {
  const layout = resolveToastLayout({
    label: 'Attack',
    total: 24,
    rolls: [{ v: 20, faces: 20, kept: true }, { v: 3, faces: 20, kept: false }],
    meta: { mode: 'advantage', bonus: 4 },
  });
  assert.equal(layout.isCrit, true);
  assert.equal(layout.isFail, false);
  assert.equal(layout.modeChip.label, 'ADV');
  assert.equal(layout.modifier, '+4');
  assert.equal(layout.dice[1].dimmed, true, 'the discarded die is still shown, dimmed');
});

test('a discarded 20 does not make a natural 20', () => {
  const layout = resolveToastLayout({
    label: 'Attack',
    total: 5,
    rolls: [{ v: 20, faces: 20, kept: false }, { v: 2, faces: 20, kept: true }],
    meta: { mode: 'disadvantage' },
  });
  assert.equal(layout.isCrit, false);
  assert.equal(layout.modeChip.label, 'DIS');
});

// Damage rolls carry no meta.bonus, so the flat modifier has to be read back out
// of the line the roller saw.
test('a damage roll recovers its modifier from the detail line', () => {
  const layout = resolveToastLayout({
    label: 'Damage',
    detail: '2d6 [4, 5] + 3',
    total: 12,
    rolls: [{ v: 4, faces: 6 }, { v: 5, faces: 6 }],
  });
  assert.equal(layout.modifier, '+3');
  assert.equal(layout.modeChip, null);
});

test('an entry with no total keeps its words', () => {
  const layout = resolveToastLayout({ label: 'Short Rest', detail: 'Spent 2 Hit Dice', total: null });
  assert.equal(layout.total, null);
  assert.equal(layout.detail, 'Spent 2 Hit Dice');
  assert.equal(layout.dice.length, 0);
});

test('a die is coloured by its own faces, not by twenty', () => {
  assert.equal(rollDieColor(6, 6), '#edd48a', 'a maxed d6 reads as a good roll');
  assert.equal(rollDieColor(1, 6), '#de675f');
  assert.equal(rollDieColor(6, 20), 'text.primary');
});

// A coin flip has no good side and no bad one: heads is 1, and the fumble
// colour turned the head red.
test('a coin is neither a triumph nor a disaster', () => {
  assert.equal(rollDieColor(1, 2), 'text.primary');
  assert.equal(rollDieColor(2, 2), 'text.primary');
});

test('a bonus always carries its sign', () => {
  assert.equal(formatRollBonus(3), '+3');
  assert.equal(formatRollBonus(-1), '-1');
  assert.equal(formatRollBonus(0), '+0');
});
