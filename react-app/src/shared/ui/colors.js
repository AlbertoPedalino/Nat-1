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
  // Accent: the interface's one highlight colour (sunflower), its text and line
  // tones, and the ink written on a filled accent.
  accent: '#ffc83d',
  accentText: '#ffdb7a',
  accentHighlight: '#ffeab0',
  accentMuted: '#c99a2e',
  onAccent: '#2a1c00',

  // Text, brightest to faintest, and the strongest neutral outline.
  textPrimary: '#fbf4ec',
  textSecondary: '#c2b9ad',
  textMuted: '#938a7f',
  textFaint: '#6f675e',
  outline: '#5e5750',

  // Surfaces, lightest to darkest. `surface` is the paper of cards and
  // dialogs, `page` the page behind them.
  surfaceRaised: '#2e2a26',
  // A speech bubble (toasts, roll bubbles over pieces): lighter than any
  // surface, so it stands off the page and the map.
  bubble: '#4a433b',
  surfaceHeader: '#2a2623',
  surface: '#24211e',
  surfaceDeep: '#1f1c19',
  page: '#1a1816',
  surfaceSunken: '#141210',
  surfaceDarkest: '#0f0e0c',
  // The drawn outline round panels, cards and buttons, and the solid shadow
  // under what can be pressed: the interface's drawn, cartoon edge.
  edge: '#0d0b09',
  black: '#000000',
  white: '#ffffff',

  // Danger: failures, damage, removal.
  dangerStrong: '#ff3b5c',
  danger: '#ff4d6d',
  dangerText: '#ff94a6',
  dangerMuted: '#d48a9a',
  dangerDeep: '#b02d48',
  dangerSurface: '#2a0d16',

  // Warning, and the stronger step before danger (a High encounter).
  warning: '#ff9a3c',
  warningStrong: '#ff7a2e',
  warningText: '#ffc27f',

  // Penalty: disadvantage and reduced values.
  penalty: '#ff9a3c',
  penaltyText: '#ffc27f',

  // Success and healing.
  success: '#5fd48a',
  successText: '#a8eec2',

  // Secondary accent (the theme's secondary): advantage, bonuses.
  secondary: '#a3e36b',
  secondaryStrong: '#7cc443',
  secondaryText: '#cdf3a8',
  onSecondary: '#142409',

  // Information and links.
  info: '#5aa9ff',
  infoText: '#a9d0ff',

  // Spellcasting.
  spell: '#c38cff',

  // The default token colour of a player character.
  pcToken: '#5c8fe0',

  // Dice, painted like the app's icon: deep green faces, a lighter green on
  // the faces turned towards the light, and cream edges and numbers.
  dieFace: '#1d4a24',
  dieFaceLit: '#4f8a4b',
  onDie: '#eef0d4',
  // The inked edge of every die, drawn like the interface's outlines.
  dieEdge: '#0d0b09',
});

// The colour of a hit point readout by its tone (vitals.hpTone).
export const HP_TONE_COLORS = Object.freeze({
  healthy: UI_COLORS.success, wounded: UI_COLORS.warning, critical: UI_COLORS.dangerStrong,
});

// The app's logo (the d20 on the home cover and in public/favicon.svg): its
// greens from lit to shaded faces and its numeral's cream. Brand art, kept
// apart from the interface roles so a restyle never recolours the logo.
export const LOGO_COLORS = Object.freeze({
  light: '#7ddc8a',
  midLight: '#55c06c',
  mid: '#3a9f55',
  midDark: '#2a8044',
  dark: '#1d6534',
  darkest: '#144a26',
  numeral: '#fff3d6',
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
