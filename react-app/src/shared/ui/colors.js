// One source of truth for the interface's colours outside the battle map
// (which has its own, shared/vtt/colors.js). The MUI theme is built from these
// values, and components use them wherever a colour is written: an sx value,
// an icon's colour, or inside a border, shadow or gradient (via uiAlpha).
// Selectable palettes (player and label colours, swatches, coins) and stored
// colours (spell source tones) are data and live with their data.
// Every colour is named by its role (accent, textMuted, surfaceHeader,
// danger…), never by its hue, so a new palette changes the values here and
// every name still says what the colour is for. `<role>Text` is the readable
// tone of a role on a dark surface; `on<Role>` is the ink on a filled one.
export const UI_COLORS = Object.freeze({
  // Accent: the interface's one highlight colour (gold), its text and line
  // tones, and the ink written on a filled accent.
  accent: '#d7ad52',
  accentText: '#edd48a',
  accentHighlight: '#ffe8b0',
  accentMuted: '#b9935a',
  onAccent: '#17120d',

  // Text, brightest to faintest, and the strongest neutral outline.
  textPrimary: '#f0e6d4',
  textSecondary: '#bda98a',
  textMuted: '#9a8f7a',
  textFaint: '#7a6a4a',
  outline: '#8a7d66',

  // Surfaces, lightest to darkest. `surface` is the paper of cards and
  // dialogs, `page` the page behind them.
  surfaceRaised: '#2e2a22',
  surfaceHeader: '#23201a',
  surface: '#211d18',
  surfaceDeep: '#1a1713',
  page: '#151411',
  surfaceSunken: '#12100e',
  surfaceDarkest: '#0f0e0d',
  black: '#000000',
  white: '#ffffff',

  // Danger: failures, damage, removal.
  dangerStrong: '#e5484d',
  danger: '#de675f',
  dangerText: '#f0958d',
  dangerMuted: '#c98a8a',
  dangerDeep: '#a04848',
  dangerSurface: '#220d0b',

  // Warning, and the stronger step before danger (a High encounter).
  warning: '#d69245',
  warningStrong: '#e27b3e',
  warningText: '#e9b275',

  // Penalty: disadvantage and reduced values.
  penalty: '#ff9800',
  penaltyText: '#ffb74d',

  // Success and healing.
  success: '#58b879',
  successText: '#a9d6ae',

  // Secondary accent (the theme's secondary): advantage, bonuses.
  secondary: '#70b7a6',
  secondaryStrong: '#2ca797',
  secondaryText: '#96d8c6',
  onSecondary: '#11201c',

  // Information and links.
  info: '#4d95d6',
  infoText: '#9ec5e6',

  // Spellcasting.
  spell: '#9d7fb8',

  // The default token colour of a player character.
  pcToken: '#5c8fe0',

  // Dice, painted like the app's icon: deep green faces, a lighter green on
  // the faces turned towards the light, and cream edges and numbers.
  dieFace: '#1d4a24',
  dieFaceLit: '#4f8a4b',
  onDie: '#eef0d4',
});

// The colour of a hit point readout by its tone (vitals.hpTone).
export const HP_TONE_COLORS = Object.freeze({
  healthy: UI_COLORS.success, wounded: UI_COLORS.warning, critical: UI_COLORS.dangerStrong,
});

// How strongly a colour is laid over the surface, in steps: the faint washes
// behind rows, tints of a chosen chip, the lines of borders and dividers, the
// veils of overlays. A colour at some opacity is always
// uiAlpha(UI_COLORS.<role>, OPACITY.<step>), so a restyle can make every tint
// bolder or quieter from here.
export const OPACITY = Object.freeze({
  faint: 0.025,
  wash: 0.05,
  soft: 0.08,
  tint: 0.12,
  fill: 0.16,
  shade: 0.22,
  line: 0.3,
  edge: 0.4,
  strong: 0.55,
  heavy: 0.7,
  veil: 0.85,
  solid: 0.95,
});

// A colour of the palette at some opacity: uiAlpha(UI_COLORS.accent, OPACITY.edge).
export function uiAlpha(hex, alpha) {
  const [r, g, b] = hexChannels(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// A colour part way from one palette colour to another, 0 being `from` and 1
// being `to`: how a die shades its faces between two greens.
export function uiMix(from, to, amount) {
  const start = hexChannels(from);
  const end = hexChannels(to);
  const mixed = start.map((channel, index) => Math.round(channel + (end[index] - channel) * amount));
  return `rgb(${mixed.join(', ')})`;
}

function hexChannels(hex) {
  const value = String(hex).replace('#', '');
  return [0, 2, 4].map((offset) => parseInt(value.slice(offset, offset + 2), 16));
}

// A colour someone saved (a scene grid, a player, a class icon) as '#rrggbb'
// in lowercase, or `fallback` when it is not one.
export function normalizeHexColor(value, fallback = null) {
  const color = typeof value === 'string' ? value.trim() : '';
  return /^#[0-9a-f]{6}$/i.test(color) ? color.toLowerCase() : fallback;
}
