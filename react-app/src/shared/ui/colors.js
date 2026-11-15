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
  accentPlain: '#ffc83d',
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
  // The dark lettering written on a light fill (a gold button's label, the
  // icon on a seal, inkOn's dark choice): the ink, apart from the line round
  // things (edge), which a palette may draw in light.
  onFill: '#0d0b09',
  // The drawings over the page (the sticker paper, stickerLayout.js): their
  // fill and the line they are cut in, a shade off the page so they are felt
  // more than seen.
  pageDrawing: '#2e2a26',
  pageLine: '#0d0b09',
  // What a rule's text marks as its own (a sub-heading, a bold word, a
  // reference, a card's rule section): apart from every entity, action and
  // spell colour, so it never reads as one of their meanings.
  ruleEmphasis: '#b7d36b',
  // Armor Class: the sheet's AC tile and what wears its steel.
  armor: '#a9b8c9',
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
  accentPlain: '#8a5a00',
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
  onFill: '#1e140c',
  pageDrawing: '#f2e5c8',
  pageLine: '#d2bd92',
  ruleEmphasis: '#4a6614',
  armor: '#4e6884',
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

// The sci-fi style's dark palette, neon: a night city's signs. Deep
// blue-black surfaces, lines lit in cyan (edge), a magenta accent, acid green,
// amber and electric blue; the dark lettering on its fills stays dark
// (onFill).
const NEON_DARK = Object.freeze({
  ...COMIC_DARK,
  accent: '#ff3fd2',
  accentText: '#ff8be6',
  accentHighlight: '#ffc2f3',
  accentMuted: '#b02a92',
  accentPlain: '#ff6fe0',
  onAccent: '#14001a',
  textPrimary: '#e6f4ff',
  textSecondary: '#a9c1d9',
  textMuted: '#8ba2bb',
  textFaint: '#56657a',
  outline: '#2a3a55',
  surfaceRaised: '#141c33',
  bubble: '#1b2644',
  surfaceHeader: '#111831',
  surface: '#0d1428',
  surfaceDeep: '#0a1022',
  page: '#060a17',
  surfaceSunken: '#050814',
  surfaceDarkest: '#03050d',
  edge: '#2bd9ff',
  onFill: '#05030d',
  pageDrawing: '#0d1428',
  pageLine: '#1a2a48',
  ruleEmphasis: '#5ff2c4',
  armor: '#9fb4d6',
  dangerStrong: '#ff2e63',
  danger: '#ff3b6b',
  dangerText: '#ff8fab',
  dangerMuted: '#c06a85',
  dangerDeep: '#a3163f',
  dangerSurface: '#2a0614',
  warning: '#ffb020',
  warningStrong: '#ff8a00',
  warningText: '#ffd27a',
  penalty: '#ffb020',
  penaltyText: '#ffd27a',
  success: '#2cff9a',
  successText: '#9dffd0',
  secondary: '#b6ff3c',
  secondaryStrong: '#86e000',
  secondaryText: '#ddff9e',
  onSecondary: '#0d1a00',
  info: '#29a8ff',
  infoText: '#9fd6ff',
  spell: '#b388ff',
  reference: '#cfe3ff',
  paper: '#11203a',
  paperShade: '#0c172b',
  onPaper: '#bfe4ff',
  pcToken: '#29a8ff',
});

// The sci-fi style's light palette: a lab's clean console. Ice-white panels
// over a cool grey page, lines in a deep cyan, a magenta accent, every
// `<role>Text` deep enough to read on the white.
const NEON_LIGHT = Object.freeze({
  ...NEON_DARK,
  accent: '#c8139c',
  accentText: '#960e75',
  accentHighlight: '#ffd1f2',
  accentMuted: '#a3388a',
  accentPlain: '#960e75',
  onAccent: '#ffffff',
  textPrimary: '#0e1a2b',
  textSecondary: '#33475f',
  textMuted: '#526579',
  textFaint: '#8a9bb0',
  outline: '#b4c3d4',
  surfaceRaised: '#ffffff',
  bubble: '#ffffff',
  surfaceHeader: '#eaf2fa',
  surface: '#f6fafd',
  surfaceDeep: '#edf3f9',
  page: '#dde7f1',
  surfaceSunken: '#d6e1ec',
  surfaceDarkest: '#c7d4e2',
  edge: '#0b8fb3',
  onFill: '#04121c',
  pageDrawing: '#e6eef6',
  pageLine: '#c3d3e3',
  ruleEmphasis: '#0b7356',
  armor: '#3f5f86',
  dangerStrong: '#d1124a',
  danger: '#d81b55',
  dangerText: '#a50d3b',
  dangerMuted: '#c46a86',
  dangerDeep: '#8e0b33',
  dangerSurface: '#fde2ea',
  warning: '#e08600',
  warningStrong: '#d06a00',
  warningText: '#8a4b00',
  penalty: '#e08600',
  penaltyText: '#8a4b00',
  success: '#0aa868',
  successText: '#066b43',
  secondary: '#5aa800',
  secondaryStrong: '#468400',
  secondaryText: '#355f00',
  onSecondary: '#0d1a00',
  info: '#0a7fd8',
  infoText: '#0a5ba0',
  spell: '#7a3ee0',
  reference: '#3b5578',
  paper: '#ffffff',
  paperShade: '#e9f1f9',
  onPaper: '#14263d',
  pcToken: '#2d6fd0',
});

// The war style's dark palette, the trench: mud-black surfaces, khaki
// lettering, blood red for what matters, olive drab and gun-metal blue.
const TRENCH_DARK = Object.freeze({
  ...COMIC_DARK,
  accent: '#c41e1e',
  accentText: '#ff8a80',
  accentHighlight: '#ffc0bb',
  accentMuted: '#7a1414',
  accentPlain: '#ff5a52',
  onAccent: '#ffffff',
  textPrimary: '#e8e0cc',
  textSecondary: '#b5aa8f',
  textMuted: '#9a8f74',
  textFaint: '#6b624f',
  outline: '#4a4436',
  surfaceRaised: '#201d15',
  bubble: '#2b271c',
  surfaceHeader: '#1c1912',
  surface: '#17150f',
  surfaceDeep: '#13110c',
  page: '#0d0c09',
  surfaceSunken: '#0a0907',
  surfaceDarkest: '#060504',
  edge: '#050403',
  onFill: '#0d0c09',
  pageDrawing: '#17150f',
  pageLine: '#050403',
  ruleEmphasis: '#c9b06a',
  armor: '#9aa3a8',
  dangerStrong: '#ff3030',
  danger: '#e63b2e',
  dangerText: '#ff9a8f',
  dangerMuted: '#b56a60',
  dangerDeep: '#7a1010',
  dangerSurface: '#2a0a08',
  warning: '#d99a2b',
  warningStrong: '#c47a12',
  warningText: '#f2c77a',
  penalty: '#d99a2b',
  penaltyText: '#f2c77a',
  success: '#7a9a3a',
  successText: '#c5dc8f',
  secondary: '#8a9a3a',
  secondaryStrong: '#6a7a22',
  secondaryText: '#d0dc9a',
  onSecondary: '#141a00',
  info: '#7a92a8',
  infoText: '#bccfe0',
  spell: '#a07ac4',
  reference: '#d6c8a4',
  paper: '#d6c8a4',
  paperShade: '#c2b084',
  onPaper: '#2a2010',
  pcToken: '#7a92a8',
});

// The war style's light palette, the dossier: manila folders and old paper,
// a stamp's red, olive and steel ink, every `<role>Text` deep enough to read.
const DOSSIER_LIGHT = Object.freeze({
  ...COMIC_DARK,
  accent: '#a8181a',
  accentText: '#8a1214',
  accentHighlight: '#f2c4c0',
  accentMuted: '#7a1414',
  accentPlain: '#8a1214',
  onAccent: '#ffffff',
  textPrimary: '#1e1a10',
  textSecondary: '#463e2c',
  textMuted: '#574d37',
  textFaint: '#8e8468',
  outline: '#b0a27e',
  surfaceRaised: '#f5eedc',
  bubble: '#f8f2e2',
  surfaceHeader: '#e2d6b8',
  surface: '#ece3cc',
  surfaceDeep: '#e6dcc2',
  page: '#cfc3a3',
  surfaceSunken: '#d2c4a2',
  surfaceDarkest: '#c0b08a',
  edge: '#1a150c',
  onFill: '#1a150c',
  pageDrawing: '#ddd0b0',
  pageLine: '#b8a880',
  ruleEmphasis: '#584810',
  armor: '#465260',
  dangerStrong: '#c81a1a',
  danger: '#b01818',
  dangerText: '#841010',
  dangerMuted: '#b0706a',
  dangerDeep: '#701010',
  dangerSurface: '#f5d8d4',
  warning: '#b8700f',
  warningStrong: '#a05a0a',
  warningText: '#6a3f00',
  penalty: '#b8700f',
  penaltyText: '#6a3f00',
  success: '#4e6e20',
  successText: '#33491a',
  secondary: '#5e6e1a',
  secondaryStrong: '#4a5812',
  secondaryText: '#37400e',
  onSecondary: '#141a00',
  info: '#3e5a76',
  infoText: '#2c425a',
  spell: '#5e3a86',
  reference: '#5a4a2a',
  paper: '#f8f0d8',
  paperShade: '#e8dab4',
  onPaper: '#2a2010',
  pcToken: '#3e5a76',
});

// The gothic style's dark palette, dread: a haunted night. Violet-black
// surfaces, moonlit lettering, crimson for what matters, a sickly green.
const DREAD_DARK = Object.freeze({
  ...COMIC_DARK,
  accent: '#c8263a',
  accentText: '#ff8e9c',
  accentHighlight: '#ffc2ca',
  accentMuted: '#7a1424',
  accentPlain: '#ff6b7e',
  onAccent: '#ffffff',
  textPrimary: '#ebe4f0',
  textSecondary: '#b9adc4',
  textMuted: '#a093ad',
  textFaint: '#6a5e78',
  outline: '#4a3e58',
  surfaceRaised: '#231b2b',
  bubble: '#2e2438',
  surfaceHeader: '#1e1725',
  surface: '#1a1420',
  surfaceDeep: '#150f1a',
  page: '#0e0a12',
  surfaceSunken: '#0a070d',
  surfaceDarkest: '#060408',
  edge: '#07050a',
  onFill: '#0e0a12',
  pageDrawing: '#221a29',
  pageLine: '#07050a',
  ruleEmphasis: '#c9a0e8',
  armor: '#a8b0c0',
  dangerStrong: '#ff2a40',
  danger: '#ff3b4f',
  dangerText: '#ff9aa6',
  dangerMuted: '#c07080',
  dangerDeep: '#8a1022',
  dangerSurface: '#2a0812',
  warning: '#e0a040',
  warningStrong: '#d08020',
  warningText: '#f5cc8a',
  penalty: '#e0a040',
  penaltyText: '#f5cc8a',
  success: '#6fbf6a',
  successText: '#b5e8b0',
  secondary: '#9bc46a',
  secondaryStrong: '#78a040',
  secondaryText: '#d2ecb0',
  onSecondary: '#142409',
  info: '#8aa8d8',
  infoText: '#c2d4f0',
  spell: '#b98ae0',
  reference: '#d8cbe0',
  paper: '#d9cfbf',
  paperShade: '#c4b69e',
  onPaper: '#2a1e14',
  pcToken: '#8aa8d8',
});

// The gothic style's light palette, the mist: grey-lavender paper as through
// a fog, crimson and violet ink, every `<role>Text` deep enough to read.
const MIST_LIGHT = Object.freeze({
  ...COMIC_DARK,
  accent: '#a8182e',
  accentText: '#8a1226',
  accentHighlight: '#f5c6ce',
  accentMuted: '#7a1424',
  accentPlain: '#8a1226',
  onAccent: '#ffffff',
  textPrimary: '#1c1422',
  textSecondary: '#45384f',
  textMuted: '#574a61',
  textFaint: '#958aa0',
  outline: '#b8acc2',
  surfaceRaised: '#f8f5fa',
  bubble: '#fbf9fc',
  surfaceHeader: '#e3dce8',
  surface: '#efeaf2',
  surfaceDeep: '#e8e2ec',
  page: '#cfc8d4',
  surfaceSunken: '#d6cedc',
  surfaceDarkest: '#c4bacb',
  edge: '#1a1220',
  onFill: '#1a1220',
  pageDrawing: '#e2dbe7',
  pageLine: '#c3b8ca',
  ruleEmphasis: '#5a2e7a',
  armor: '#4a5466',
  dangerStrong: '#d01a34',
  danger: '#b81830',
  dangerText: '#8a1024',
  dangerMuted: '#b47080',
  dangerDeep: '#701020',
  dangerSurface: '#f7d8de',
  warning: '#b8760f',
  warningStrong: '#a05a0a',
  warningText: '#6a4000',
  penalty: '#b8760f',
  penaltyText: '#6a4000',
  success: '#3f7a3a',
  successText: '#2e5a2a',
  secondary: '#5a7a2a',
  secondaryStrong: '#466018',
  secondaryText: '#36500e',
  onSecondary: '#142409',
  info: '#3e5a8a',
  infoText: '#2c4470',
  spell: '#6a3a96',
  reference: '#4a3a5a',
  paper: '#fbf7ef',
  paperShade: '#ebe0cc',
  onPaper: '#2a1e14',
  pcToken: '#3e5a8a',
});

// Every palette, with the MUI mode it is drawn in (which also sets how its
// inked lettering is lettered, LETTERINGS). A style draws its dark and its
// light mode in two of them (shapes.js SHAPE_STYLES `palettes`: comic in dark
// and light, the parchment; sci-fi in neon and neonLight; war in trench and
// dossier; gothic in dread and mist).
export const PALETTES = Object.freeze({
  dark: Object.freeze({ id: 'dark', mode: 'dark', colors: COMIC_DARK }),
  light: Object.freeze({ id: 'light', mode: 'light', colors: PARCHMENT_LIGHT }),
  neon: Object.freeze({ id: 'neon', mode: 'dark', colors: NEON_DARK }),
  neonLight: Object.freeze({ id: 'neonLight', mode: 'light', colors: NEON_LIGHT }),
  trench: Object.freeze({ id: 'trench', mode: 'dark', colors: TRENCH_DARK }),
  dossier: Object.freeze({ id: 'dossier', mode: 'light', colors: DOSSIER_LIGHT }),
  dread: Object.freeze({ id: 'dread', mode: 'dark', colors: DREAD_DARK }),
  mist: Object.freeze({ id: 'mist', mode: 'light', colors: MIST_LIGHT }),
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
  const { colors, mode } = paletteOf(paletteId);
  return {
    ...Object.fromEntries(Object.entries(colors)
      .filter(([key]) => !FIXED_COLOR_KEYS.has(key))
      .map(([key, hex]) => [colorVariableName(key), hex])),
    ...Object.fromEntries(Object.entries(LETTERINGS[mode])
      .map(([part, value]) => [`--gb-lettering-${part}`, value])),
  };
}

// How inked lettering (shadows.js inkLettering) is lettered, by the
// palette's mode. On a dark palette the letters keep their own colour,
// outlined in the ink (the colour inkLettering is given) over their solid
// shadow. On a light one dark letters on the paper need no ink to read: a
// neutral (the text's browns: lightness under 0.6, chroma under 0.045) is
// printed plain, its outline gone, and a colour of a tone is outlined thinly
// in a deep shade of itself, so a title still matches its badge without the
// thick black outline that filled in the letters; no solid shadow falls. The
// outline is worked out where the letters are drawn, as it reads the
// letters' colour (currentColor). `initial` leaves the outline to the ink.
const NEUTRAL_LETTERS = 'clamp(0, (0.6 - l) * 1000, 1) * clamp(0, (0.045 - c) * 1000, 1)';
const LETTERINGS = Object.freeze({
  dark: Object.freeze({ stroke: 'initial', line: '1', drop: '1' }),
  light: Object.freeze({
    stroke: `oklch(from currentColor calc(l * 0.45) c h / calc(1 - ${NEUTRAL_LETTERS}))`,
    line: '0.6',
    drop: '0',
  }),
});
// The outline's colour (the ink `color` when the palette leaves it) and its
// width's share.
export const letteringStroke = (color) => `var(--gb-lettering-stroke, ${color})`;
export const LETTERING_LINE = 'var(--gb-lettering-line)';

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

// A colour written as '#rrggbb' (a palette's hex, a saved colour).
export function isHexColor(value) {
  return typeof value === 'string' && HEX_COLOR.test(value);
}
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
  return HEX_COLOR.test(color) ? color.toLowerCase() : fallback;
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
