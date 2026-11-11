import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveToastLayout, rollDieColor } from '../../../../../src/shared/character/dice/rollToastLayout.js';
import { UI_COLORS } from '../../../../../src/shared/ui/colors.js';

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

test('a current damage roll uses its combined formula modifier', () => {
  const layout = resolveToastLayout({
    label: 'Damage',
    detail: '1d6+3+4',
    total: 12,
    rolls: [{ v: 5, faces: 6 }],
    meta: { bonus: 7 },
  });
  assert.equal(layout.modifier, '+7');
  assert.equal(layout.modeChip, null);
});

test('an older damage roll recovers its modifier from the detail line', () => {
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
  assert.equal(rollDieColor(6, 6), UI_COLORS.accentText, 'a maxed d6 reads as a good roll');
  assert.equal(rollDieColor(1, 6), UI_COLORS.danger);
  assert.equal(rollDieColor(6, 20), 'text.primary');
});

// A coin flip has no good side and no bad one: heads is 1, and the fumble
// colour turned the head red.
test('a coin is neither a triumph nor a disaster', () => {
  assert.equal(rollDieColor(1, 2), 'text.primary');
  assert.equal(rollDieColor(2, 2), 'text.primary');
});

test('a zero d20 modifier is omitted from the toast layout', () => {
  const layout = resolveToastLayout({
    label: 'Strength Check',
    total: 12,
    rolls: [{ v: 12, faces: 20, kept: true }],
    meta: { bonus: 0, kept: 12 },
  });

  assert.equal(layout.modifier, null);
});

// A roll wears the colour of where it was rolled from: a check or save its
// panel's, an attack, damage or healing its roll button's; no kind, no colour.
test('a roll is coloured by its kind, a natural 20 or 1 keeping its own', async () => {
  const { PANEL_TONES, ROLL_TONES } = await import('../../../../../src/shared/ui/entityColors.js');
  const d20 = (v, kind) => ({ total: v + 2, rolls: [{ v, faces: 20, kept: true }], meta: { bonus: 2, kind } });
  assert.equal(resolveToastLayout(d20(10, 'save')).tone, PANEL_TONES.savingThrows);
  assert.equal(resolveToastLayout(d20(10, 'skill')).totalColor, PANEL_TONES.skills);
  assert.equal(resolveToastLayout(d20(10, 'attack')).tone, ROLL_TONES.attack);
  assert.equal(resolveToastLayout(d20(10)).tone, null);
  assert.equal(resolveToastLayout(d20(20, 'save')).totalColor, UI_COLORS.accentText);
  assert.equal(resolveToastLayout(d20(10, 'save')).modifierColor, UI_COLORS.successText);
});
