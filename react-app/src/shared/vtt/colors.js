import { clamp } from '../numbers.js';
import { darken, rgbToHex } from '@mui/material';
import { UI_COLORS } from '../ui/colors.js';
import { DAMAGE_TYPE_COLORS } from '../ui/entityColors.js';
// One source of truth for VTT colours used outside MUI's simple theme-aware
// properties (canvas pixels, SVG attributes, gradients and compound shadows).
// Components should still prefer `gmboard.vtt.*` in `sx` when a theme token is
// enough; both APIs are backed by this palette. Interface colours are named
// by role and read from UI_COLORS, so a new interface palette reaches the map;
// what is drawn on the board (vitals bars, drawings, effects) keeps its own.
export const VTT_COLORS = Object.freeze({
  // The battle map's interface: the same roles as the rest of the app, read
  // from UI_COLORS. Its accent is the interface's bright accent tone, which
  // reads better over a map than the base one.
  black: UI_COLORS.black,
  white: UI_COLORS.white,
  surface: UI_COLORS.surfaceDarkest,
  surfaceRaised: UI_COLORS.surfaceDeep,
  accent: UI_COLORS.accentText,
  accentHighlight: UI_COLORS.accentHighlight,
  text: UI_COLORS.textPrimary,
  textSecondary: UI_COLORS.textSecondary,
  textMuted: UI_COLORS.textMuted,
  warning: UI_COLORS.warning,
  danger: UI_COLORS.danger,
  dangerDeep: UI_COLORS.dangerDeep,
  success: UI_COLORS.success,

  // Drawn on the board itself: the empty viewport, the seam behind stitched
  // tiles, and the darker vitals tones that stay legible over any map.
  viewport: '#0b0a09',
  stitchBackground: UI_COLORS.surfaceSunken,
  // The interface's vitals tones, a step darker so bars stay legible over
  // any map while following the palette.
  hpHealthy: rgbToHex(darken(UI_COLORS.success, 0.2)),
  hpWounded: rgbToHex(darken(UI_COLORS.warning, 0.1)),
  hpCritical: rgbToHex(darken(UI_COLORS.danger, 0.2)),
  tempHp: rgbToHex(darken(UI_COLORS.info, 0.2)),
  tempHpText: '#dff0fb',
  deathText: '#f7e9dc',
  neutralMark: '#e2dac6',
  drawingGuide: '#6fd1e8',
  drawingText: '#dff4fb',
  laser: '#ff5046',
  laserCore: '#ffebe6',
  laserText: '#ffd9d4',
  dungeon: '#7a5aa8',
  objectDefault: '#6f5b32',
  exploredHex: '#6f8f5a',
  // Areas of effect: the outline each effect suggests, and the hue its
  // animation is built around — a damage type's own colour, the same as on
  // the sheet's defenses.
  areaFire: DAMAGE_TYPE_COLORS.fire,
  areaPoison: DAMAGE_TYPE_COLORS.poison,
  areaCold: DAMAGE_TYPE_COLORS.cold,
  areaAcid: DAMAGE_TYPE_COLORS.acid,
  areaLightning: DAMAGE_TYPE_COLORS.lightning,
  areaNecrotic: DAMAGE_TYPE_COLORS.necrotic,
  areaRadiant: DAMAGE_TYPE_COLORS.radiant,
  areaDarkness: '#7a6a9a',
  areaThorns: '#8f9a45',
  // Whose turn it is: a colour nothing else on the board uses (gold already
  // means hidden or selected), readable over any map and on a projector.
  turnActive: '#3fe0ff',
});

// The map's darker hit point tones, for bars drawn over the board.
export const VTT_HP_TONE_COLORS = Object.freeze({
  healthy: VTT_COLORS.hpHealthy, wounded: VTT_COLORS.hpWounded, critical: VTT_COLORS.hpCritical,
});

export function vttAlpha(color, alpha) {
  const match = /^#([0-9a-f]{6})$/i.exec(color || '');
  if (!match) return color;
  const value = Number.parseInt(match[1], 16);
  const red = (value >> 16) & 255;
  const green = (value >> 8) & 255;
  const blue = value & 255;
  return `rgba(${red}, ${green}, ${blue}, ${clamp(Number(alpha), 0, 1)})`;
}
