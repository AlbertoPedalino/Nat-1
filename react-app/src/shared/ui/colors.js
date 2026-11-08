// One source of truth for the interface's colours outside the battle map
// (which has its own, shared/vtt/colors.js). The MUI theme is built from these
// values, and components use them wherever a colour is written: an sx value,
// an icon's colour, or inside a border, shadow or gradient (via uiAlpha).
// Selectable palettes (player and label colours, swatches, coins) and stored
// colours (spell source tones) are data and live with their data.
export const UI_COLORS = Object.freeze({
  // Gold, the accent family.
  primary: '#d7ad52',
  primaryContrast: '#17120d',
  gold: '#caa550',
  goldLight: '#edd48a',
  goldBright: '#e8c96a',
  goldDeep: '#c8a84b',
  goldDim: '#b4965a',
  goldWarm: '#c9a86a',
  goldAmber: '#d5a84b',
  goldPale: '#ffe8b0',
  amber: '#c9923f',
  amberBright: '#d6a849',
  conditional: '#b9935a',

  // Text.
  textPrimary: '#f0e6d4',
  textSecondary: '#bda98a',
  textParchment: '#c4b393',
  textParchmentSoft: '#c7b690',
  textCondition: '#cabd9f',
  textToast: '#edd9b0',
  textStone: '#a89882',
  textRail: '#b8a87a',
  textMuted: '#9a8f7a',
  textFaint: '#9f947d',
  textDim: '#9a8a6a',
  textBrown: '#7a6a4a',
  borderMuted: '#8a7d66',

  // Surfaces, lightest to darkest.
  surfaceRaised: '#2e2a22',
  surfaceHover: '#2a261f',
  headerBg: '#23201a',
  surfaceHome: '#1a1815',
  surfaceDeep: '#1a1713',
  surfaceSunken: '#14120f',
  ink: '#12100e',
  inkSoft: '#11100e',
  inkDeep: '#0f0e0d',
  avatarText: '#101010',
  black: '#000000',
  white: '#ffffff',

  // Danger, from bright to deep.
  dangerBright: '#e5484d',
  dangerFlat: '#e74c3c',
  danger: '#de675f',
  // An encounter rated High, between warning and danger.
  difficultyHigh: '#e27b3e',
  dangerFumble: '#d3473a',
  dangerHp: '#c54a3f',
  dangerSoft: '#d99292',
  dangerMuted: '#c98a8a',
  dangerDim: '#a75d5d',
  dangerDeep: '#a04848',
  dangerInk: '#220d0b',

  // Success and healing.
  successLight: '#a9d6ae',
  success: '#58b879',
  successMuted: '#68aa71',
  successGlow: '#6eaf5f',
  successDeep: '#3fa66c',
  successFlat: '#27ae60',

  // Warning and disadvantage.
  orangeLight: '#ffb74d',
  orange: '#ff9800',
  warningToast: '#e0a33a',
  warning: '#d69245',

  // Teal (the theme's secondary), blue and purple accents.
  tealLight: '#96d8c6',
  tealFlat: '#1abc9c',
  teal: '#70b7a6',
  tealDeep: '#2ca797',
  blueLight: '#9ec5e6',
  blueSoft: '#81b3e8',
  pcToken: '#5c8fe0',
  blue: '#4d95d6',
  purple: '#9d7fb8',
});

// The colour of a hit point readout by its tone (vitals.hpTone).
export const HP_TONE_COLORS = Object.freeze({
  healthy: UI_COLORS.success, wounded: UI_COLORS.warning, critical: UI_COLORS.dangerHp,
});

// A colour of the palette at some opacity: uiAlpha(UI_COLORS.gold, 0.4).
export function uiAlpha(hex, alpha) {
  const value = String(hex).replace('#', '');
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// A colour someone saved (a scene grid, a player, a class icon) as '#rrggbb'
// in lowercase, or `fallback` when it is not one.
export function normalizeHexColor(value, fallback = null) {
  const color = typeof value === 'string' ? value.trim() : '';
  return /^#[0-9a-f]{6}$/i.test(color) ? color.toLowerCase() : fallback;
}
