import { clamp } from '../numbers.js';
import { UI_COLORS } from '../ui/colors.js';
// One source of truth for VTT colours used outside MUI's simple theme-aware
// properties (canvas pixels, SVG attributes, gradients and compound shadows).
// Components should still prefer `gmboard.vtt.*` in `sx` when a theme token is
// enough; both APIs are backed by this palette. Colours the map shares with
// the rest of the interface (its gold, ink, text and status tones) are read
// from UI_COLORS, so a new interface palette reaches the map too.
export const VTT_COLORS = Object.freeze({
  black: UI_COLORS.black,
  ink: UI_COLORS.inkDeep,
  viewport: '#0b0a09',
  stitchBackground: UI_COLORS.ink,
  surfaceRaised: UI_COLORS.surfaceDeep,
  gold: UI_COLORS.goldBright,
  goldSoft: '#edc36f',
  goldRoll: UI_COLORS.goldLight,
  goldHandle: '#f1d77d',
  goldPreview: '#f2df9d',
  goldBright: '#f4dda0',
  goldUiBright: '#f3df9c',
  parchment: '#f3ead6',
  parchmentMuted: '#e8dcc0',
  panelText: '#d9cfb8',
  panelTextSoft: '#cdbb83',
  panelTextMuted: '#b9ad91',
  panelTextFaint: UI_COLORS.textFaint,
  railText: UI_COLORS.textRail,
  rollDetail: '#8a7a5a',
  selectText: '#eadba9',
  selectSurface: '#161411',
  sheetSurface: '#0a0909',
  overlaySurface: '#050507',
  warning: UI_COLORS.warning,
  error: UI_COLORS.danger,
  danger: '#b3423a',
  dangerBright: '#df6b62',
  dangerDeep: '#8f2f34',
  success: '#4f8a5b',
  successBright: '#7bc78a',
  deathSuccess: '#4f9c62',
  hpHealthy: '#4f8a5b',
  hpWounded: '#c8973f',
  hpCritical: '#b3423a',
  tempHp: '#4f7fa8',
  tempHpText: '#dff0fb',
  drawingGuide: '#6fd1e8',
  drawingText: '#dff4fb',
  laser: '#ff5046',
  laserCore: '#ffebe6',
  laserText: '#ffd9d4',
  white: UI_COLORS.white,
  deathText: '#f7e9dc',
  neutralMark: '#e2dac6',
  menuSuccess: '#70b78f',
  menuDanger: '#d76767',
  dungeon: '#7a5aa8',
  objectDefault: '#6f5b32',
  exploredHex: '#6f8f5a',
  // Areas of effect: the outline each effect suggests, and the hue its
  // animation is built around.
  areaFire: '#ff7a2a',
  areaPoison: '#7cc444',
  areaCold: '#86d4ff',
  areaAcid: '#cde04a',
  areaLightning: '#a9c4ff',
  areaNecrotic: '#9a6ad8',
  areaRadiant: '#ffd86a',
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
