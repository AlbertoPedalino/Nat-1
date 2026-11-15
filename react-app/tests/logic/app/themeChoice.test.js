import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_THEME_CHOICE, MODE_CHOICES, STYLE_CHOICES, STYLE_DICE, chosenDice, normalizeThemeChoice, paletteForStyle,
  resolvedMode,
} from '../../../src/app/themeChoice.js';
import {
  DICE_COLORS, DICE_STYLES, diceVariables, normalizeDice, resolveDice, sharedDice,
} from '../../../src/shared/ui/diceSets.js';
import { PALETTES } from '../../../src/shared/ui/colors.js';
import { SHAPE_STYLES } from '../../../src/shared/ui/shapes.js';

test('a theme choice keeps only known modes and styles', () => {
  assert.deepEqual(normalizeThemeChoice(null), DEFAULT_THEME_CHOICE);
  assert.deepEqual(normalizeThemeChoice({ mode: 'light', style: 'scifi' }), { mode: 'light', style: 'scifi', diceStyle: STYLE_DICE, diceColors: STYLE_DICE });
  assert.deepEqual(normalizeThemeChoice({ mode: 'plaid', style: 'chrome' }), DEFAULT_THEME_CHOICE);
  assert.deepEqual(MODE_CHOICES.map(({ id }) => id), ['system', 'dark', 'light']);
  assert.deepEqual(STYLE_CHOICES.map(({ id }) => id), ['comic', 'scifi', 'gothic', 'war', 'astral', 'pirate', 'steampunk', 'dwarven', 'fey', 'abyssal', 'pixel', 'cyberpunk']);
});

test('a choice kept before modes is read as the mode of its palette', () => {
  assert.deepEqual(normalizeThemeChoice({ colors: 'light', style: 'comic' }), { mode: 'light', style: 'comic', diceStyle: STYLE_DICE, diceColors: STYLE_DICE });
  assert.deepEqual(normalizeThemeChoice({ colors: 'system' }), { mode: 'system', style: 'comic', diceStyle: STYLE_DICE, diceColors: STYLE_DICE });
  assert.deepEqual(normalizeThemeChoice({ colors: 'dark' }), { mode: 'dark', style: 'comic', diceStyle: STYLE_DICE, diceColors: STYLE_DICE });
});

test('System follows the device; a chosen mode is drawn as chosen', () => {
  assert.equal(resolvedMode('system', true), 'light');
  assert.equal(resolvedMode('system', false), 'dark');
  assert.equal(resolvedMode('light', false), 'light');
  assert.equal(resolvedMode('dark', true), 'dark');
});

test('each style draws each mode in a palette of that mode', () => {
  assert.equal(paletteForStyle('comic', 'dark'), 'dark');
  assert.equal(paletteForStyle('comic', 'light'), 'light');
  assert.equal(paletteForStyle('scifi', 'dark'), 'neon');
  assert.equal(paletteForStyle('scifi', 'light'), 'neonLight');
  Object.values(SHAPE_STYLES).forEach(({ id, palettes }) => {
    ['dark', 'light'].forEach((mode) => {
      assert.ok(PALETTES[palettes[mode]], `${id} ${mode}`);
      assert.equal(PALETTES[palettes[mode]].mode, mode, `${id} ${mode}`);
    });
  });
});

test('index.html reads the same key the app keeps the choice in, before the first paint', async () => {
  const { readFileSync } = await import('node:fs');
  const { THEME_CHOICE_KEY } = await import('../../../src/app/themeChoice.js');
  assert.ok(readFileSync('index.html', 'utf8').includes(`localStorage.getItem('${THEME_CHOICE_KEY}')`));
});

test("the dice are the look's own unless picked, their style and colours apart", () => {
  assert.deepEqual(chosenDice(normalizeThemeChoice({ style: 'gothic' })), { style: 'gothic', colors: 'gothic' });
  assert.deepEqual(chosenDice(normalizeThemeChoice({ style: 'gothic', diceColors: 'pirate' })), { style: 'gothic', colors: 'pirate' });
  assert.deepEqual(chosenDice(normalizeThemeChoice({ style: 'gothic', diceStyle: 'pixel' })), { style: 'pixel', colors: 'gothic' });
  const plaid = normalizeThemeChoice({ style: 'gothic', diceStyle: 'plaid', diceColors: 'plaid' });
  assert.deepEqual([plaid.diceStyle, plaid.diceColors], [STYLE_DICE, STYLE_DICE]);
});

// WCAG relative luminance of a hex.
const luminance = (hex) => [1, 3, 5].map((at) => parseInt(hex.slice(at, at + 2), 16) / 255)
  .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  .reduce((sum, c, i) => sum + c * [0.2126, 0.7152, 0.0722][i], 0);

test('every style has its dice, each face dark under a number that reads on it', () => {
  assert.deepEqual(Object.keys(DICE_COLORS).sort(), Object.keys(SHAPE_STYLES).sort());
  assert.deepEqual(Object.keys(DICE_STYLES).sort(), Object.keys(SHAPE_STYLES).sort());
  Object.values(DICE_COLORS).forEach(({ id, face, number }) => {
    // Dark enough for a result's own colour (gold, red) to read on any set.
    assert.ok(luminance(face) < 0.12, `${id} face`);
    assert.ok((luminance(number) + 0.05) / (luminance(face) + 0.05) >= 4.5, `${id} number`);
  });
  assert.deepEqual(normalizeDice({ style: 'nonsense', colors: 'pirate' }), { style: 'comic', colors: 'pirate' });
  assert.equal(resolveDice({ style: 'pixel', colors: 'fey' }).style.id, 'pixel');
  assert.equal(sharedDice({ style: 'plaid', colors: 'plaid' }), null);
  assert.deepEqual(Object.keys(diceVariables({ colors: 'pirate' })).sort(), ['--gb-die-edge', '--gb-die-face', '--gb-die-face-lit', '--gb-on-die']);
});
