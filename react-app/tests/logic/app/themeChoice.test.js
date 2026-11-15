import test from 'node:test';
import assert from 'node:assert/strict';
import {
  COLOR_CHOICES, DEFAULT_THEME_CHOICE, normalizeThemeChoice, paletteForColors,
} from '../../../src/app/themeChoice.js';

test('a theme choice keeps only known colours and styles', () => {
  assert.deepEqual(normalizeThemeChoice(null), DEFAULT_THEME_CHOICE);
  assert.deepEqual(normalizeThemeChoice({ colors: 'light', style: 'comic' }), { colors: 'light', style: 'comic' });
  assert.deepEqual(normalizeThemeChoice({ colors: 'neon', style: 'chrome' }), DEFAULT_THEME_CHOICE);
  assert.deepEqual(COLOR_CHOICES.map(({ id }) => id), ['system', 'dark', 'light']);
});

test('System follows the device; a chosen palette is drawn as chosen', () => {
  assert.equal(paletteForColors('system', true), 'light');
  assert.equal(paletteForColors('system', false), 'dark');
  assert.equal(paletteForColors('light', false), 'light');
  assert.equal(paletteForColors('dark', true), 'dark');
});
