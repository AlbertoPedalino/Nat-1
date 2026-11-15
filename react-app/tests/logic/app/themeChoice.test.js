import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_THEME_CHOICE, MODE_CHOICES, STYLE_CHOICES, normalizeThemeChoice, paletteForStyle, resolvedMode,
} from '../../../src/app/themeChoice.js';
import { PALETTES } from '../../../src/shared/ui/colors.js';
import { SHAPE_STYLES } from '../../../src/shared/ui/shapes.js';

test('a theme choice keeps only known modes and styles', () => {
  assert.deepEqual(normalizeThemeChoice(null), DEFAULT_THEME_CHOICE);
  assert.deepEqual(normalizeThemeChoice({ mode: 'light', style: 'scifi' }), { mode: 'light', style: 'scifi' });
  assert.deepEqual(normalizeThemeChoice({ mode: 'plaid', style: 'chrome' }), DEFAULT_THEME_CHOICE);
  assert.deepEqual(MODE_CHOICES.map(({ id }) => id), ['system', 'dark', 'light']);
  assert.deepEqual(STYLE_CHOICES.map(({ id }) => id), ['comic', 'scifi']);
});

test('a choice kept before modes is read as the mode of its palette', () => {
  assert.deepEqual(normalizeThemeChoice({ colors: 'light', style: 'comic' }), { mode: 'light', style: 'comic' });
  assert.deepEqual(normalizeThemeChoice({ colors: 'system' }), { mode: 'system', style: 'comic' });
  assert.deepEqual(normalizeThemeChoice({ colors: 'dark' }), { mode: 'dark', style: 'comic' });
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
