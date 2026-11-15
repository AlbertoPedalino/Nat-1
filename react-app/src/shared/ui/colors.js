// One source of truth for the interface's colours outside the battle map
// (which has its own, shared/vtt/colors.js). The MUI theme is built from these
// values, and components use them wherever a colour is written: an sx value,
// an icon's colour, or inside a border, shadow or gradient (via uiAlpha).
// Selectable palettes (player and label colours, swatches, coins) and stored
// colours (spell source tones) are data and live with their data.
// Every colour is named by its role (accent, textMuted, surfaceHeader,
// danger…), never by its hue, so a new palette changes the values here and
// every name still says what the colour is for. `<role>Text` is the readable
// tone of a role on its palette's surfaces; `on<Role>` is the ink on a filled one.
//
// The interface wears one of several palettes (PALETTES, chosen by the viewer:
// app/ThemeChoiceProvider.jsx), so a role is not one hex: UI_COLORS.<role> is
// the CSS variable the chosen palette fills (`var(--gb-accent)`), and the
// palette's own hexes are PALETTES.<id>.colors. Every recipe that works a
// colour out (uiAlpha, uiMix, uiLighten, uiDarken) takes either and answers
// in CSS (color-mix) when it is given a variable. What cannot read CSS (a
// canvas, a picture drawn as a data URL, a colour saved in data) takes the
// palette's hexes through resolveColors / storedColor.
const COMIC_DARK = Object.freeze({
  // Accent: the interface's one highlight colour (sunflower), its text and line
  // tones, and the ink written on a filled accent.
  accent: '#ffc83d',
  accentText: '#ffdb7a',
  accentHighlight: '#ffeab0',
  accentMuted: '#c99a2e',
  // The accent as plain lettering (a label, a link, an icon) on the palette's
  // surfaces, with no ink round it: here the accent itself; a light palette
  // darkens it to be read. A lettering inked in the accent (a heading, a
  // figure) keeps the accent, its ink outline carries it on any surface.
  accentLabel: '#ffc83d',
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
  // The drawings over the page (the sticker paper, stickerLayout.js): their
  // fill and the line they are cut in, a shade off the page so they are felt
  // more than seen.
  pageDrawing: '#2e2a26',
  pageLine: '#0d0b09',
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

  // Books and written rules (the Compendium's mark): a page's warm ivory.
  reference: '#e8d9b5',

  // Paper laid on the interface (a rulebook's boxed text, a missing picture's
  // sheet): the ivory, its shaded foot and the brown ink written on it.
  paper: '#e8d9b5',
  paperShade: '#d9c79c',
  onPaper: '#3a2a12',

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

// The light palette: a rulebook's parchment. Warm ivory surfaces over a
// darker page, the same near-black ink, an antique gold accent, and every
// `<role>Text` darkened to be read on the ivory (chosen from the look-book,
// 2026-11-15). Dice and the logo keep their own colours.
const PARCHMENT_LIGHT = Object.freeze({
  ...COMIC_DARK,
  accent: '#e3a417',
  accentText: '#8a5a00',
  accentHighlight: '#ffe08a',
  accentMuted: '#b07c12',
  accentLabel: '#8a5a00',
  onAccent: '#2a1c00',
  textPrimary: '#2b2118',
  textSecondary: '#55473a',
  textMuted: '#6f5f53',
  textFaint: '#a39280',
  outline: '#b9a78f',
  surfaceRaised: '#fffaf0',
  bubble: '#fffdf8',
  surfaceHeader: '#f1e4c9',
  surface: '#fbf3e2',
  surfaceDeep: '#f3e8d2',
  page: '#e9d8b6',
  surfaceSunken: '#e4d2ae',
  surfaceDarkest: '#d6c197',
  edge: '#1e140c',
  pageDrawing: '#f2e5c8',
  pageLine: '#d2bd92',
  dangerStrong: '#d1183a',
  danger: '#c8203e',
  dangerText: '#9e1029',
  dangerMuted: '#b8697a',
  dangerDeep: '#8e1028',
  dangerSurface: '#f8dbe0',
  warning: '#e07a10',
  warningStrong: '#d65a0a',
  warningText: '#8f4700',
  penalty: '#e07a10',
  penaltyText: '#8f4700',
  success: '#2f9d5a',
  successText: '#1b6638',
  secondary: '#6aa62f',
  secondaryStrong: '#4f8a1d',
  secondaryText: '#3a6412',
  onSecondary: '#142409',
  info: '#2f78d6',
  infoText: '#1a52a0',
  spell: '#8a4fd6',
  reference: '#7a5a2a',
  paper: '#fffdf6',
  paperShade: '#f0e3c4',
  onPaper: '#3a2a12',
  pcToken: '#3f72c8',
});

// The palettes the viewer can choose from (the "Colours" of the account menu),
// each with the MUI mode it is drawn in and how its inked lettering is
// outlined (`lettering`, LETTERING_EDGE).
export const PALETTES = Object.freeze({
  dark: Object.freeze({ id: 'dark', label: 'Dark', mode: 'dark', lettering: 'ink', colors: COMIC_DARK }),
  light: Object.freeze({ id: 'light', label: 'Light', mode: 'light', lettering: 'contrast', colors: PARCHMENT_LIGHT }),
});

// The palette a colour saved in data is written in, and the one used where no
// palette was chosen (tests, the first paint).
export const BASE_PALETTE_ID = 'dark';

export function paletteOf(paletteId) {
  return PALETTES[paletteId] || PALETTES[BASE_PALETTE_ID];
}

// Pure black and white are not roles: a veil is black and a glint white in
// every palette.
const FIXED_COLOR_KEYS = new Set(['black', 'white']);

const colorVariableName = (key) => `--gb-${key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`;
const KEY_BY_VARIABLE = new Map(Object.keys(COMIC_DARK).map((key) => [colorVariableName(key).slice('--gb-'.length), key]));

// The interface's colours by role, as the chosen palette's CSS variables.
export const UI_COLORS = Object.freeze(Object.fromEntries(Object.entries(COMIC_DARK).map(([key, hex]) => [
  key, FIXED_COLOR_KEYS.has(key) ? hex : `var(${colorVariableName(key)})`,
])));

// The CSS variables a palette fills, { '--gb-accent': '#ffc83d', … }: written
// on the page's root by the theme (ThemeChoiceProvider).
export function paletteVariables(paletteId) {
  const { colors, lettering } = paletteOf(paletteId);
  return {
    ...Object.fromEntries(Object.entries(colors)
      .filter(([key]) => !FIXED_COLOR_KEYS.has(key))
      .map(([key, hex]) => [colorVariableName(key), hex])),
    '--gb-lettering-edge': LETTERING_EDGES[lettering] || LETTERING_EDGES.ink,
  };
}

// The outline of inked lettering (shadows.js inkLettering): on a dark palette
// the ink, as every edge (`ink`); on a light one the outline takes the side
// away from the letters' own colour (`contrast`: light round dark letters,
// dark round light ones, from the colour's lightness), as a dark letter in a
// dark outline would read as a blot. Worked out where the letters are drawn,
// as it reads their colour (currentColor).
const LETTERING_EDGES = Object.freeze({
  ink: 'var(--gb-edge)',
  contrast: 'oklch(from currentColor clamp(0, (0.6 - l) * 1000, 1) 0 0)',
});
export const LETTERING_EDGE = 'var(--gb-lettering-edge)';

// The colour of a hit point readout by its tone (vitals.hpTone).
export const HP_TONE_COLORS = Object.freeze({
  healthy: UI_COLORS.success, wounded: UI_COLORS.warning, critical: UI_COLORS.dangerStrong,
});

// Temporary hit points: their bar and their figure.
export const TEMP_HP_TONE = UI_COLORS.info;

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

const HEX_COLOR = /^#[0-9a-f]{6}$/i;
const percent = (share) => Number((share * 100).toFixed(2));

// A colour of the palette at some opacity: uiAlpha(UI_COLORS.accent, OPACITY.edge).
// A hex answers in rgba(); a role (a CSS variable) or a worked colour in
// color-mix(), which the chosen palette fills.
export function uiAlpha(color, alpha) {
  if (HEX_COLOR.test(color)) {
    const [r, g, b] = hexChannels(color);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return `color-mix(in srgb, ${color} ${percent(alpha)}%, transparent)`;
}

// The wash alone, as a background image: laid over whatever background the
// element already has (a lit button half, a toggle under the cursor), so a
// solid fill stays solid. tintedSurfaceSx when the element needs its base too.
export function washImage(tone, amount = OPACITY.tint) {
  const wash = uiAlpha(tone, amount);
  return `linear-gradient(${wash}, ${wash})`;
}

// A colour part way from one palette colour to another, 0 being `from` and 1
// being `to`: how a die shades its faces between two greens.
export function uiMix(from, to, amount) {
  if (HEX_COLOR.test(from) && HEX_COLOR.test(to)) {
    const start = hexChannels(from);
    const end = hexChannels(to);
    const mixed = start.map((channel, index) => Math.round(channel + (end[index] - channel) * amount));
    return `rgb(${mixed.join(', ')})`;
  }
  return `color-mix(in srgb, ${from}, ${to} ${percent(amount)}%)`;
}

// A colour lightened towards white, or darkened towards black, by `amount`
// (0–1): MUI's lighten and darken, for roles as well as hexes.
export function uiLighten(color, amount) {
  return uiMix(color, UI_COLORS.white, amount);
}

export function uiDarken(color, amount) {
  return uiMix(color, UI_COLORS.black, amount);
}

function hexChannels(hex) {
  const value = String(hex).replace('#', '');
  return [0, 2, 4].map((offset) => parseInt(value.slice(offset, offset + 2), 16));
}

// Whether a colour (or a CSS text holding colours: a gradient, an SVG) names
// the palette's roles, so it reads differently in each palette.
export function readsPalette(text) {
  return typeof text === 'string' && (text.includes('var(--gb-') || text.includes('color-mix('));
}

// `text` with every role written in `paletteId`'s hexes and every color-mix
// worked out to an rgb()/rgba(): what a canvas, a picture drawn as a data URL
// or a contrast check needs, as none of them reads CSS variables. Text that
// names no role is returned as it is.
export function resolveColors(text, paletteId = BASE_PALETTE_ID) {
  if (!readsPalette(text)) return text;
  const { colors } = paletteOf(paletteId);
  let resolved = text.replace(/var\(--gb-([a-z0-9-]+)\)/g, (match, name) => colors[KEY_BY_VARIABLE.get(name)] || match);
  // Innermost first: a mix of mixes is worked out from inside.
  for (let guard = 0; resolved.includes('color-mix(') && guard < 32; guard += 1) {
    const next = resolved.replace(COLOR_MIX, (match, first, firstShare, second, secondShare) => mixColors(first, firstShare, second, secondShare) || match);
    if (next === resolved) break;
    resolved = next;
  }
  return resolved;
}

// A colour saved in data (a grid's, a drawing's, a placed object's) is always
// a hex, never a role: written in the base palette, so it reads the same
// wherever it is opened.
export function storedColor(color) {
  return resolveColors(color, BASE_PALETTE_ID);
}

const MIX_COLOR = String.raw`(#[0-9a-fA-F]{3,8}|rgba?\([^()]*\)|transparent)`;
const MIX_SHARE = String.raw`(?:\s+(\d+(?:\.\d+)?)%)?`;
const COLOR_MIX = new RegExp(String.raw`color-mix\(in srgb,\s*${MIX_COLOR}${MIX_SHARE},\s*${MIX_COLOR}${MIX_SHARE}\)`, 'g');

function colorChannels(color) {
  if (color === 'transparent') return [0, 0, 0, 0];
  if (color.startsWith('#')) {
    const value = color.slice(1);
    const full = value.length <= 4 ? [...value].map((digit) => digit + digit).join('') : value;
    const [r, g, b] = [0, 2, 4].map((offset) => parseInt(full.slice(offset, offset + 2), 16));
    const a = full.length === 8 ? parseInt(full.slice(6, 8), 16) / 255 : 1;
    return [r, g, b, a];
  }
  const parts = color.slice(color.indexOf('(') + 1, -1).split(',').map((part) => Number(part.trim()));
  return parts.length === 3 ? [...parts, 1] : parts;
}

// CSS's own sum (premultiplied, in sRGB): a missing share is what the other
// leaves, none at all is half each.
function mixColors(first, firstShare, second, secondShare) {
  let p1 = firstShare === undefined ? null : Number(firstShare) / 100;
  let p2 = secondShare === undefined ? null : Number(secondShare) / 100;
  if (p1 === null && p2 === null) { p1 = 0.5; p2 = 0.5; }
  else if (p1 === null) p1 = 1 - p2;
  else if (p2 === null) p2 = 1 - p1;
  const total = p1 + p2;
  if (!total) return null;
  p1 /= total;
  p2 /= total;
  const a = colorChannels(first);
  const b = colorChannels(second);
  const alpha = a[3] * p1 + b[3] * p2;
  if (!alpha) return 'transparent';
  const channel = (index) => Math.round((a[index] * a[3] * p1 + b[index] * b[3] * p2) / alpha);
  const rgb = [channel(0), channel(1), channel(2)].join(', ');
  return alpha >= 1 ? `rgb(${rgb})` : `rgba(${rgb}, ${Number(alpha.toFixed(4))})`;
}

// A colour someone saved (a scene grid, a player, a class icon) as '#rrggbb'
// in lowercase, or `fallback` when it is not one.
export function normalizeHexColor(value, fallback = null) {
  const color = typeof value === 'string' ? value.trim() : '';
  return /^#[0-9a-f]{6}$/i.test(color) ? color.toLowerCase() : fallback;
}

// The comic screentone: fine diagonal hatching in a colour — a panel bar's
// texture in the panel's own, a disabled button's (pressable.js), a table's
// head (ruleText.js). Here with the palette, as washImage, so any recipe can
// use it without importing the surfaces. `tone` is a palette colour (a role or
// a hex); anything else (a theme path) takes the accent. Cut as the style
// hatches (shapes.js surface.screentone: `--gb-screentone-*`): a line of 0 is
// no hatching at all.
export function panelScreentone(tone = UI_COLORS.accent) {
  const ink = HEX_COLOR.test(tone) || readsPalette(tone) ? tone : UI_COLORS.accent;
  return `repeating-linear-gradient(var(--gb-screentone-angle), ${uiAlpha(ink, OPACITY.soft)} 0 var(--gb-screentone-line), transparent var(--gb-screentone-line) var(--gb-screentone-gap))`;
}
