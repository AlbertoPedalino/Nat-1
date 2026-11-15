import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PALETTES, UI_COLORS, paletteVariables, resolveColors, storedColor, uiAlpha, uiDarken, uiLighten, uiMix,
} from '../../../../src/shared/ui/colors.js';
import { vttAlpha, vttCanvasColors, VTT_COLORS } from '../../../../src/shared/vtt/colors.js';

const DARK = PALETTES.dark.colors;

test('a role is the chosen palette\'s CSS variable; black and white stay fixed', () => {
  assert.equal(UI_COLORS.accent, 'var(--gb-accent)');
  assert.equal(UI_COLORS.surfaceRaised, 'var(--gb-surface-raised)');
  assert.equal(UI_COLORS.black, '#000000');
  assert.equal(paletteVariables('dark')['--gb-accent'], DARK.accent);
  assert.equal(paletteVariables('dark')['--gb-black'], undefined);
});

test('the colour recipes keep their hex answers and answer roles in color-mix', () => {
  assert.equal(uiAlpha('#ffc83d', 0.3), 'rgba(255, 200, 61, 0.3)');
  assert.equal(uiAlpha(UI_COLORS.accent, 0.3), 'color-mix(in srgb, var(--gb-accent) 30%, transparent)');
  assert.equal(uiMix('#ffc83d', '#0d0b09', 0.45), 'rgb(146, 115, 38)');
  assert.equal(uiMix(UI_COLORS.accent, UI_COLORS.edge, 0.45), 'color-mix(in srgb, var(--gb-accent), var(--gb-edge) 45%)');
});

test('resolveColors works a role out to what the hex recipe gives', () => {
  assert.equal(resolveColors(uiAlpha(UI_COLORS.accent, 0.3)), uiAlpha(DARK.accent, 0.3));
  assert.equal(resolveColors(uiMix(UI_COLORS.accent, UI_COLORS.edge, 0.45)), uiMix(DARK.accent, DARK.edge, 0.45));
  assert.equal(resolveColors(uiLighten(UI_COLORS.surfaceRaised, 0.06)), uiLighten(DARK.surfaceRaised, 0.06));
  assert.equal(resolveColors(uiDarken(UI_COLORS.success, 0.2)), uiDarken(DARK.success, 0.2));
  assert.equal(resolveColors(`<path fill="${UI_COLORS.accent}"/>`), `<path fill="${DARK.accent}"/>`);
  assert.equal(resolveColors('currentColor'), 'currentColor');
});

test('a colour saved in data is a hex, never a role', () => {
  assert.equal(storedColor(UI_COLORS.accentText), DARK.accentText);
  assert.equal(storedColor('#abcdef'), '#abcdef');
});

test('the map takes roles at an opacity and gives a canvas plain colours', () => {
  assert.equal(vttAlpha(VTT_COLORS.accent, 2), 'color-mix(in srgb, var(--gb-accent-text) 100%, transparent)');
  const canvas = vttCanvasColors('dark');
  assert.equal(canvas.accent, DARK.accentText);
  assert.ok(Object.values(canvas).every((color) => !color.includes('var(') && !color.includes('color-mix(')));
});

test('every palette fills the same roles', () => {
  const roles = Object.keys(PALETTES.dark.colors).sort();
  Object.values(PALETTES).forEach((palette) => assert.deepEqual(Object.keys(palette.colors).sort(), roles, palette.id));
  assert.equal(PALETTES.light.mode, 'light');
  assert.notEqual(PALETTES.light.colors.page, PALETTES.dark.colors.page);
});

// WCAG contrast of two hexes.
function contrast(a, b) {
  const lum = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
    .reduce((sum, c, i) => sum + c * [0.2126, 0.7152, 0.0722][i], 0);
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}

// Short of AA already when the palettes were made switchable (2026-11-15), and
// kept so the dark look stays as it was: the dark palette's quietest text on
// its two raised surfaces. Any other pair falling short fails.
const KNOWN_SHORT = Object.freeze({
  dark: ['textMuted on surfaceRaised', 'textMuted on surfaceHeader'],
});

test('in every palette the text roles read on the surfaces they are written on (WCAG AA)', () => {
  const text = ['textPrimary', 'textSecondary', 'textMuted', 'accentText', 'accentLabel', 'dangerText', 'warningText', 'successText', 'secondaryText', 'infoText', 'ruleEmphasis'];
  const surfaces = ['surface', 'surfaceRaised', 'surfaceHeader'];
  Object.values(PALETTES).forEach(({ id, colors }) => {
    const failing = text.flatMap((role) => surfaces
      .filter((surface) => contrast(colors[role], colors[surface]) < 4.5)
      .map((surface) => `${role} on ${surface}`))
      .filter((pair) => !(KNOWN_SHORT[id] || []).includes(pair));
    assert.deepEqual(failing, [], id);
    assert.ok(contrast(colors.onAccent, colors.accent) >= 4.5, `${id} onAccent`);
    assert.ok(contrast(colors.onPaper, colors.paper) >= 4.5, `${id} onPaper`);
  });
});
