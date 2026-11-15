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
  textMuted: '#4a5b6d',
  textFaint: '#8a9bb0',
  outline: '#b4c3d4',
  surfaceRaised: '#ffffff',
  bubble: '#ffffff',
  surfaceHeader: '#ecc7e8',
  surface: '#f6fafd',
  surfaceDeep: '#edf3f9',
  page: '#a9d3ee',
  surfaceSunken: '#d6e1ec',
  surfaceDarkest: '#9fc6e0',
  edge: '#0b8fb3',
  onFill: '#04121c',
  pageDrawing: '#cce5f5',
  pageLine: '#98bed6',
  ruleEmphasis: '#0a654c',
  armor: '#3f5f86',
  dangerStrong: '#d1124a',
  danger: '#d81b55',
  dangerText: '#a50d3b',
  dangerMuted: '#c46a86',
  dangerDeep: '#8e0b33',
  dangerSurface: '#fde2ea',
  warning: '#e08600',
  warningStrong: '#d06a00',
  warningText: '#874a00',
  penalty: '#e08600',
  penaltyText: '#8a4b00',
  success: '#0aa868',
  successText: '#066740',
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
  textMuted: '#554b36',
  textFaint: '#8e8468',
  outline: '#b0a27e',
  surfaceRaised: '#f5eedc',
  bubble: '#f8f2e2',
  surfaceHeader: '#ddb6a5',
  surface: '#ece3cc',
  surfaceDeep: '#e6dcc2',
  page: '#c4ab7c',
  surfaceSunken: '#d2c4a2',
  surfaceDarkest: '#b8a175',
  edge: '#1a150c',
  onFill: '#1a150c',
  pageDrawing: '#d6c4a0',
  pageLine: '#b09a70',
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
  surfaceHeader: '#dfbcc7',
  surface: '#efeaf2',
  surfaceDeep: '#e8e2ec',
  page: '#b9a8cc',
  surfaceSunken: '#d6cedc',
  surfaceDarkest: '#ae9ec0',
  edge: '#1a1220',
  onFill: '#1a1220',
  pageDrawing: '#d1c6dd',
  pageLine: '#a697b8',
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

// The astral style's dark palette, starlight: a wizard's tower at night.
// Indigo surfaces, moonlit lettering, a lavender accent, gold for a rule.
const STARLIGHT_DARK = Object.freeze({
  ...COMIC_DARK,
  accent: '#b8a6ff',
  accentText: '#cdc1ff',
  accentHighlight: '#e3dbff',
  accentMuted: '#8174b2',
  accentPlain: '#b8a6ff',
  onAccent: '#1c1926',
  textPrimary: '#e8ecff',
  textSecondary: '#acb0c4',
  textMuted: '#8a8ea3',
  textFaint: '#666a81',
  outline: '#555970',
  surfaceRaised: '#20243c',
  bubble: '#3e4156',
  surfaceHeader: '#1c2038',
  surface: '#161a33',
  surfaceDeep: '#13162c',
  page: '#0b0e20',
  surfaceSunken: '#080b19',
  surfaceDarkest: '#060813',
  edge: '#05060e',
  onFill: '#05060e',
  pageDrawing: '#20243c',
  pageLine: '#05060e',
  ruleEmphasis: '#ffd27a',
  armor: '#b4c0d8',
  dangerStrong: '#ff4a62',
  danger: '#ff5c7a',
  dangerText: '#ff95a9',
  dangerMuted: '#de7e98',
  dangerDeep: '#993749',
  dangerSurface: '#2d192d',
  warning: '#ffb454',
  warningStrong: '#ff9a5f',
  warningText: '#ffce90',
  penalty: '#ffb454',
  penaltyText: '#ffce90',
  success: '#5fe0a8',
  successText: '#97ebc6',
  secondary: '#9fe870',
  secondaryStrong: '#7fba5a',
  secondaryText: '#bcef9b',
  onSecondary: '#182311',
  info: '#6fb6ff',
  infoText: '#a1d0ff',
  spell: '#ff8ae0',
  reference: '#d9d4f2',
  paper: '#ece6d6',
  paperShade: '#d9d4c5',
  onPaper: '#2a2440',
  pcToken: '#6fb6ff',
});

// The astral style's light palette, vellum: a star chart's pale paper,
// violet and midnight ink.
const VELLUM_LIGHT = Object.freeze({
  ...COMIC_DARK,
  accent: '#5a3fc0',
  accentText: '#442f90',
  accentHighlight: '#cec5ec',
  accentMuted: '#3f2c86',
  accentPlain: '#5139ad',
  onAccent: '#ffffff',
  textPrimary: '#1e1a3a',
  textSecondary: '#343141',
  textMuted: '#4f4c5d',
  textFaint: '#a09ab2',
  outline: '#b0aac2',
  surfaceRaised: '#f7f4fe',
  bubble: '#faf8fe',
  surfaceHeader: '#c8bcec',
  surface: '#efe8fc',
  surfaceDeep: '#e5ddf9',
  page: '#b9a9ea',
  surfaceSunken: '#d7ccf4',
  surfaceDarkest: '#ae9fdc',
  edge: '#151229',
  onFill: '#151229',
  pageDrawing: '#d1c5f2',
  pageLine: '#a698d3',
  ruleEmphasis: '#6b4800',
  armor: '#4a5878',
  dangerStrong: '#ba203b',
  danger: '#c0284a',
  dangerText: '#961f3a',
  dangerMuted: '#882c46',
  dangerDeep: '#73182c',
  dangerSurface: '#f4d8de',
  warning: '#a8640a',
  warningStrong: '#af521d',
  warningText: '#724407',
  penalty: '#a8640a',
  penaltyText: '#724407',
  success: '#1f7a50',
  successText: '#175a3b',
  secondary: '#3f7a14',
  secondaryStrong: '#326210',
  secondaryText: '#2d580e',
  onSecondary: '#091203',
  info: '#1f5fb0',
  infoText: '#194e90',
  spell: '#a0287a',
  reference: '#3a3460',
  paper: '#fbf7ec',
  paperShade: '#e7e3d9',
  onPaper: '#2a2440',
  pcToken: '#1f5fb0',
});

// The pirate style's dark palette, the deep sea: teal-black waters,
// a doubloon's gold, sea foam for a rule.
const DEEP_SEA_DARK = Object.freeze({
  ...COMIC_DARK,
  accent: '#f0b43c',
  accentText: '#f4ca76',
  accentHighlight: '#f9e1b1',
  accentMuted: '#a87e2a',
  accentPlain: '#f0b43c',
  onAccent: '#241b09',
  textPrimary: '#f2ead8',
  textSecondary: '#b8b9af',
  textMuted: '#91958f',
  textFaint: '#666f6c',
  outline: '#545f5e',
  surfaceRaised: '#1b2e34',
  bubble: '#39494e',
  surfaceHeader: '#16292f',
  surface: '#10242a',
  surfaceDeep: '#0e1f24',
  page: '#08161b',
  surfaceSunken: '#061115',
  surfaceDarkest: '#050d10',
  edge: '#040a0c',
  onFill: '#040a0c',
  pageDrawing: '#1b2e34',
  pageLine: '#040a0c',
  ruleEmphasis: '#7fe8d8',
  armor: '#a9c0c9',
  dangerStrong: '#ff483b',
  danger: '#ff5a4a',
  dangerText: '#ff9489',
  dangerMuted: '#e38072',
  dangerDeep: '#99362c',
  dangerSurface: '#2b2022',
  warning: '#ff9a3c',
  warningStrong: '#ff8740',
  warningText: '#ffbd80',
  penalty: '#ff9a3c',
  penaltyText: '#ffbd80',
  success: '#4fd6a0',
  successText: '#8de4c1',
  secondary: '#b0e060',
  secondaryStrong: '#8db34d',
  secondaryText: '#c8e990',
  onSecondary: '#1a220e',
  info: '#4fc0e8',
  infoText: '#8dd6f0',
  spell: '#c38cff',
  reference: '#e8d9b5',
  paper: '#ecdcb0',
  paperShade: '#d9caa2',
  onPaper: '#3a2a12',
  pcToken: '#4fc0e8',
});

// The pirate style's light palette, the sea chart: a weathered map's
// paper, the red of the X that marks the spot.
const SEA_CHART_LIGHT = Object.freeze({
  ...COMIC_DARK,
  accent: '#a8321e',
  accentText: '#7e2616',
  accentHighlight: '#e5c2bc',
  accentMuted: '#762315',
  accentPlain: '#8a2919',
  onAccent: '#ffffff',
  textPrimary: '#2a1e10',
  textSecondary: '#383025',
  textMuted: '#534a3b',
  textFaint: '#a8997d',
  outline: '#b9a98b',
  surfaceRaised: '#faf2e0',
  bubble: '#fcf7ec',
  surfaceHeader: '#e2b696',
  surface: '#f6e4c0',
  surfaceDeep: '#e3dfc1',
  page: '#8fcac6',
  surfaceSunken: '#c8d8c3',
  surfaceDarkest: '#86beba',
  edge: '#1d150b',
  onFill: '#1d150b',
  pageDrawing: '#bdd6c3',
  pageLine: '#81b6b2',
  ruleEmphasis: '#0d545d',
  armor: '#3e5866',
  dangerStrong: '#ad1d15',
  danger: '#b0241a',
  dangerText: '#941e16',
  dangerMuted: '#80291e',
  dangerDeep: '#6a1610',
  dangerSurface: '#f1d8d6',
  warning: '#a85a0a',
  warningStrong: '#aa4a0f',
  warningText: '#723d07',
  penalty: '#a85a0a',
  penaltyText: '#723d07',
  success: '#2a7050',
  successText: '#20553d',
  secondary: '#4f6e14',
  secondaryStrong: '#3f5810',
  secondaryText: '#3c540f',
  onSecondary: '#0c1003',
  info: '#1f5f80',
  infoText: '#1a506c',
  spell: '#6a3a96',
  reference: '#5a4020',
  paper: '#fbf3dc',
  paperShade: '#e7e0ca',
  onPaper: '#2a1e10',
  pcToken: '#1f5f80',
});

// The steampunk style's dark palette, the foundry: oiled walnut,
// polished brass, verdigris for a rule.
const FOUNDRY_DARK = Object.freeze({
  ...COMIC_DARK,
  accent: '#d9a441',
  accentText: '#e4bf7a',
  accentHighlight: '#f0dbb3',
  accentMuted: '#98732e',
  accentPlain: '#d9a441',
  onAccent: '#21190a',
  textPrimary: '#f3e6d0',
  textSecondary: '#bab0a0',
  textMuted: '#978c7e',
  textFaint: '#71685b',
  outline: '#61574c',
  surfaceRaised: '#2c241f',
  bubble: '#48413c',
  surfaceHeader: '#28201a',
  surface: '#221a14',
  surfaceDeep: '#1d1611',
  page: '#140f0b',
  surfaceSunken: '#0f0c08',
  surfaceDarkest: '#0c0906',
  edge: '#090705',
  onFill: '#090705',
  pageDrawing: '#2c241f',
  pageLine: '#090705',
  ruleEmphasis: '#7fd0c0',
  armor: '#b0b8c0',
  dangerStrong: '#ff4c37',
  danger: '#ff5f45',
  dangerText: '#ff9786',
  dangerMuted: '#e37f69',
  dangerDeep: '#993929',
  dangerSurface: '#351a13',
  warning: '#ff8f3a',
  warningStrong: '#ff813d',
  warningText: '#ffb67f',
  penalty: '#ff8f3a',
  penaltyText: '#ffb67f',
  success: '#7fcf7a',
  successText: '#ace0a9',
  secondary: '#b8d86a',
  secondaryStrong: '#93ad55',
  secondaryText: '#cde497',
  onSecondary: '#1c2010',
  info: '#7ab8d8',
  infoText: '#a9d1e6',
  spell: '#c79aff',
  reference: '#e8d9b5',
  paper: '#efe2c4',
  paperShade: '#dcd0b4',
  onPaper: '#3a2a12',
  pcToken: '#7ab8d8',
});

// The steampunk style's light palette, the patent: an engineer's cream
// drawing paper, copper and sepia ink.
const PATENT_LIGHT = Object.freeze({
  ...COMIC_DARK,
  accent: '#a85520',
  accentText: '#7e4018',
  accentHighlight: '#e5ccbc',
  accentMuted: '#763c16',
  accentPlain: '#7c3f18',
  onAccent: '#ffffff',
  textPrimary: '#2a1c10',
  textSecondary: '#3e352b',
  textMuted: '#584f41',
  textFaint: '#a89982',
  outline: '#b9a991',
  surfaceRaised: '#faf2e4',
  bubble: '#fcf8ee',
  surfaceHeader: '#e2c09c',
  surface: '#f6e6c8',
  surfaceDeep: '#f1dbb9',
  page: '#d9a877',
  surfaceSunken: '#e9caa4',
  surfaceDarkest: '#cc9e70',
  edge: '#1d140b',
  onFill: '#1d140b',
  pageDrawing: '#e6c49b',
  pageLine: '#c3976b',
  ruleEmphasis: '#1b5b4d',
  armor: '#4a5866',
  dangerStrong: '#ad2015',
  danger: '#b0281a',
  dangerText: '#9b2317',
  dangerMuted: '#822d21',
  dangerDeep: '#6a1810',
  dangerSurface: '#f1d8d6',
  warning: '#9a5a0a',
  warningStrong: '#a14b0f',
  warningText: '#754408',
  penalty: '#9a5a0a',
  penaltyText: '#754408',
  success: '#2f6e30',
  successText: '#275c28',
  secondary: '#5a6a14',
  secondaryStrong: '#485510',
  secondaryText: '#4a5710',
  onSecondary: '#0e1003',
  info: '#245a7a',
  infoText: '#235675',
  spell: '#5e3a86',
  reference: '#5a4a2a',
  paper: '#fffaf0',
  paperShade: '#ebe6dd',
  onPaper: '#2a1c10',
  pcToken: '#245a7a',
});

// The dwarven style's dark palette, the forge: soot and stone, embers
// for what matters, the gold of the hoard for a rule.
const FORGE_DARK = Object.freeze({
  ...COMIC_DARK,
  accent: '#ff7a1a',
  accentText: '#ffa25f',
  accentHighlight: '#ffcaa3',
  accentMuted: '#b25512',
  accentPlain: '#ff7a1a',
  onAccent: '#261204',
  textPrimary: '#f0ebe4',
  textSecondary: '#b6b2ad',
  textMuted: '#928e8a',
  textFaint: '#6e6b67',
  outline: '#5d5a57',
  surfaceRaised: '#282625',
  bubble: '#444342',
  surfaceHeader: '#242221',
  surface: '#1e1c1b',
  surfaceDeep: '#1a1817',
  page: '#121110',
  surfaceSunken: '#0e0d0c',
  surfaceDarkest: '#0a0a09',
  edge: '#080807',
  onFill: '#080807',
  pageDrawing: '#282625',
  pageLine: '#080807',
  ruleEmphasis: '#ffd27a',
  armor: '#b8c0c8',
  dangerStrong: '#ff3b31',
  danger: '#ff4a3d',
  dangerText: '#ff8981',
  dangerMuted: '#e2746a',
  dangerDeep: '#992c25',
  dangerSurface: '#331916',
  warning: '#ffb03a',
  warningStrong: '#ff913b',
  warningText: '#ffcc7f',
  penalty: '#ffb03a',
  penaltyText: '#ffcc7f',
  success: '#7fcf8a',
  successText: '#ace0b3',
  secondary: '#a8d86a',
  secondaryStrong: '#86ad55',
  secondaryText: '#c2e497',
  onSecondary: '#192010',
  info: '#7aa8d0',
  infoText: '#a9c6e0',
  spell: '#b98aff',
  reference: '#e0d6c4',
  paper: '#e2dccf',
  paperShade: '#d0cabe',
  onPaper: '#2a2018',
  pcToken: '#7aa8d0',
});

// The dwarven style's light palette, granite: pale hewn stone, iron ink,
// the forge's ember.
const GRANITE_LIGHT = Object.freeze({
  ...COMIC_DARK,
  accent: '#b4410f',
  accentText: '#87310b',
  accentHighlight: '#e8c6b7',
  accentMuted: '#7e2e0a',
  accentPlain: '#8c330c',
  onAccent: '#ffffff',
  textPrimary: '#1e1b18',
  textSecondary: '#363535',
  textMuted: '#4f5050',
  textFaint: '#9a9c9e',
  outline: '#aaadaf',
  surfaceRaised: '#f2f5f8',
  bubble: '#f8f9fa',
  surfaceHeader: '#d9bfb6',
  surface: '#e6ebf0',
  surfaceDeep: '#dbe1e8',
  page: '#a9b6c4',
  surfaceSunken: '#cbd3dc',
  surfaceDarkest: '#9fabb8',
  edge: '#151311',
  onFill: '#151311',
  pageDrawing: '#c4ced8',
  pageLine: '#98a4b0',
  ruleEmphasis: '#6e4800',
  armor: '#4a5460',
  dangerStrong: '#b31a15',
  danger: '#b8201a',
  dangerText: '#9b1b16',
  dangerMuted: '#842825',
  dangerDeep: '#6e1310',
  dangerSurface: '#f2d7d6',
  warning: '#946000',
  warningStrong: '#9f4d08',
  warningText: '#6e4700',
  penalty: '#946000',
  penaltyText: '#6e4700',
  success: '#2e6e3a',
  successText: '#265a30',
  secondary: '#4f6a14',
  secondaryStrong: '#3f5510',
  secondaryText: '#415710',
  onSecondary: '#0c1003',
  info: '#2f5a80',
  infoText: '#2b5376',
  spell: '#5e3a86',
  reference: '#4a4038',
  paper: '#faf7f0',
  paperShade: '#e6e3dd',
  onPaper: '#2a2018',
  pcToken: '#2f5a80',
});

// The fey style's dark palette, twilight: a grove after sundown, moss
// surfaces, a fairy's pink, fairy gold for a rule.
const TWILIGHT_DARK = Object.freeze({
  ...COMIC_DARK,
  accent: '#ff9ad5',
  accentText: '#ffb8e2',
  accentHighlight: '#ffd7ee',
  accentMuted: '#b26c95',
  accentPlain: '#ff9ad5',
  onAccent: '#261720',
  textPrimary: '#eef6e8',
  textSecondary: '#aeb7ac',
  textMuted: '#8b978b',
  textFaint: '#667368',
  outline: '#556257',
  surfaceRaised: '#1e2c23',
  bubble: '#3b4840',
  surfaceHeader: '#19281f',
  surface: '#132219',
  surfaceDeep: '#101d16',
  page: '#0a140e',
  surfaceSunken: '#080f0b',
  surfaceDarkest: '#060c08',
  edge: '#040906',
  onFill: '#040906',
  pageDrawing: '#1e2c23',
  pageLine: '#040906',
  ruleEmphasis: '#f0e080',
  armor: '#b0c8c0',
  dangerStrong: '#ff4855',
  danger: '#ff5a6a',
  dangerText: '#ff949e',
  dangerMuted: '#df7f84',
  dangerDeep: '#993640',
  dangerSurface: '#2c1e1b',
  warning: '#ffc04a',
  warningStrong: '#ffa154',
  warningText: '#ffd689',
  penalty: '#ffc04a',
  penaltyText: '#ffd689',
  success: '#6fe08a',
  successText: '#a1ebb3',
  secondary: '#d8f070',
  secondaryStrong: '#adc05a',
  secondaryText: '#e4f49b',
  onSecondary: '#202411',
  info: '#7ac8ff',
  infoText: '#a9dbff',
  spell: '#c89aff',
  reference: '#e8e0c8',
  paper: '#efe8d0',
  paperShade: '#dcd5bf',
  onPaper: '#2a2414',
  pcToken: '#7ac8ff',
});

// The fey style's light palette, blossom: pale spring leaves, rose and
// fern ink.
const BLOSSOM_LIGHT = Object.freeze({
  ...COMIC_DARK,
  accent: '#b0306e',
  accentText: '#842452',
  accentHighlight: '#e7c1d4',
  accentMuted: '#7b224d',
  accentPlain: '#94285c',
  onAccent: '#ffffff',
  textPrimary: '#1a2618',
  textSecondary: '#323930',
  textMuted: '#4d544b',
  textFaint: '#9ca898',
  outline: '#adb8a8',
  surfaceRaised: '#f6fbf2',
  bubble: '#f9fdf8',
  surfaceHeader: '#dcc3c7',
  surface: '#ecf7e6',
  surfaceDeep: '#edece3',
  page: '#f0bcd6',
  surfaceSunken: '#eedcdf',
  surfaceDarkest: '#e2b1c9',
  edge: '#121b11',
  onFill: '#121b11',
  pageDrawing: '#eed7dd',
  pageLine: '#d8a9c1',
  ruleEmphasis: '#6b417f',
  armor: '#46586a',
  dangerStrong: '#b31a25',
  danger: '#b8202e',
  dangerText: '#a21c28',
  dangerMuted: '#822a2f',
  dangerDeep: '#6e131c',
  dangerSurface: '#f2d7d9',
  warning: '#946000',
  warningStrong: '#9f4d0e',
  warningText: '#734b00',
  penalty: '#946000',
  penaltyText: '#734b00',
  success: '#2a7038',
  successText: '#235e2f',
  secondary: '#4a6a10',
  secondaryStrong: '#3b550d',
  secondaryText: '#405b0e',
  onSecondary: '#0b1002',
  info: '#1f5f90',
  infoText: '#1d5784',
  spell: '#6a3a96',
  reference: '#3e4a30',
  paper: '#fdfaf0',
  paperShade: '#e9e6dd',
  onPaper: '#2a2414',
  pcToken: '#1f5f90',
});

// The cosmic style's dark palette, the abyss: a drowned black-green, an
// eldritch teal, a sickly violet for a rule.
const ABYSS_DARK = Object.freeze({
  ...COMIC_DARK,
  accent: '#3fe0b0',
  accentText: '#79e9c8',
  accentHighlight: '#b2f3df',
  accentMuted: '#2c9d7b',
  accentPlain: '#3fe0b0',
  onAccent: '#09221a',
  textPrimary: '#e4eeea',
  textSecondary: '#a7b0ae',
  textMuted: '#858f8d',
  textFaint: '#616b6a',
  outline: '#505a5a',
  surfaceRaised: '#1c2426',
  bubble: '#394143',
  surfaceHeader: '#172022',
  surface: '#111a1c',
  surfaceDeep: '#0f1618',
  page: '#070d0f',
  surfaceSunken: '#050a0c',
  surfaceDarkest: '#040809',
  edge: '#030607',
  onFill: '#030607',
  pageDrawing: '#1c2426',
  pageLine: '#030607',
  ruleEmphasis: '#d0a0ff',
  armor: '#a0b8b8',
  dangerStrong: '#ff3b55',
  danger: '#ff4a6a',
  dangerText: '#ff899e',
  dangerMuted: '#dc7385',
  dangerDeep: '#992c40',
  dangerSurface: '#2a161c',
  warning: '#e8c050',
  warningStrong: '#ef9d58',
  warningText: '#f0d68d',
  penalty: '#e8c050',
  penaltyText: '#f0d68d',
  success: '#a0e060',
  successText: '#c1eb98',
  secondary: '#c8e86a',
  secondaryStrong: '#a0ba55',
  secondaryText: '#d8ef97',
  onSecondary: '#1e2310',
  info: '#6aa0ff',
  infoText: '#9ec1ff',
  spell: '#b27aff',
  reference: '#cfe0d8',
  paper: '#dcd8c4',
  paperShade: '#cac7b4',
  onPaper: '#1e2420',
  pcToken: '#6aa0ff',
});

// The cosmic style's light palette, the asylum: a ward's pale green
// walls, a case file's ink.
const ASYLUM_LIGHT = Object.freeze({
  ...COMIC_DARK,
  accent: '#13755e',
  accentText: '#0e5846',
  accentHighlight: '#b8d6cf',
  accentMuted: '#0d5242',
  accentPlain: '#0f5e4b',
  onAccent: '#ffffff',
  textPrimary: '#141e1c',
  textSecondary: '#313835',
  textMuted: '#4d5452',
  textFaint: '#94a09a',
  outline: '#a5b1ab',
  surfaceRaised: '#f1f8f4',
  bubble: '#f7faf8',
  surfaceHeader: '#add0c4',
  surface: '#e3f0e8',
  surfaceDeep: '#d7e8de',
  page: '#9fc6b0',
  surfaceSunken: '#c4ddcf',
  surfaceDarkest: '#95baa5',
  edge: '#0e1514',
  onFill: '#0e1514',
  pageDrawing: '#bed9c9',
  pageLine: '#8fb29e',
  ruleEmphasis: '#6a2e8a',
  armor: '#465a5a',
  dangerStrong: '#ad162e',
  danger: '#b01c3a',
  dangerText: '#a21a35',
  dangerMuted: '#7d2738',
  dangerDeep: '#6a1123',
  dangerSurface: '#f1d6dc',
  warning: '#8a6200',
  warningStrong: '#954d11',
  warningText: '#6c4c00',
  penalty: '#8a6200',
  penaltyText: '#6c4c00',
  success: '#3a6e1a',
  successText: '#315c16',
  secondary: '#5a6a10',
  secondaryStrong: '#48550d',
  secondaryText: '#4a570d',
  onSecondary: '#0e1002',
  info: '#244e9a',
  infoText: '#244e9a',
  spell: '#5a2e96',
  reference: '#2e403a',
  paper: '#f8f6ec',
  paperShade: '#e4e2d9',
  onPaper: '#1e2420',
  pcToken: '#244e9a',
});

// The pixel style's dark palette, the arcade: a cabinet's midnight
// blue, a coin's yellow, bright 8-bit hues.
const ARCADE_DARK = Object.freeze({
  ...COMIC_DARK,
  accent: '#ffd23f',
  accentText: '#ffe079',
  accentHighlight: '#ffedb2',
  accentMuted: '#b2932c',
  accentPlain: '#ffd23f',
  onAccent: '#262009',
  textPrimary: '#f4f4ff',
  textSecondary: '#b1b1c4',
  textMuted: '#9090a6',
  textFaint: '#6a6a85',
  outline: '#595975',
  surfaceRaised: '#202043',
  bubble: '#3e3e5b',
  surfaceHeader: '#1c1c3f',
  surface: '#16163a',
  surfaceDeep: '#131332',
  page: '#0b0b22',
  surfaceSunken: '#08081a',
  surfaceDarkest: '#060614',
  edge: '#05050f',
  onFill: '#05050f',
  pageDrawing: '#202043',
  pageLine: '#05050f',
  ruleEmphasis: '#80ff80',
  armor: '#b0b8d0',
  dangerStrong: '#ff334d',
  danger: '#ff4060',
  dangerText: '#ff8398',
  dangerMuted: '#e06d88',
  dangerDeep: '#99263a',
  dangerSurface: '#2d122b',
  warning: '#ff9a30',
  warningStrong: '#ff7f3e',
  warningText: '#ffbd78',
  penalty: '#ff9a30',
  penaltyText: '#ffbd78',
  success: '#40e070',
  successText: '#83eba2',
  secondary: '#40f0e0',
  secondaryStrong: '#33c0b3',
  secondaryText: '#79f4e9',
  onSecondary: '#0a2422',
  info: '#4aa0ff',
  infoText: '#89c1ff',
  spell: '#d070ff',
  reference: '#e0e0ff',
  paper: '#f0e8d0',
  paperShade: '#ddd5bf',
  onPaper: '#1a1a2a',
  pcToken: '#4aa0ff',
});

// The pixel style's light palette, the cartridge: a label's cream,
// bold 8-bit ink.
const CARTRIDGE_LIGHT = Object.freeze({
  ...COMIC_DARK,
  accent: '#e0a400',
  accentText: '#7c5b00',
  accentHighlight: '#f6e4b2',
  accentMuted: '#9d7300',
  accentPlain: '#7d5c00',
  onAccent: '#221900',
  textPrimary: '#1a1a2a',
  textSecondary: '#484544',
  textMuted: '#656058',
  textFaint: '#a8a08c',
  outline: '#bab199',
  surfaceRaised: '#fff8e4',
  bubble: '#fffbee',
  surfaceHeader: '#f7de94',
  surface: '#fff2c8',
  surfaceDeep: '#ebead2',
  page: '#8fc8ff',
  surfaceSunken: '#cddfe1',
  surfaceDarkest: '#86bcf0',
  edge: '#12121d',
  onFill: '#12121d',
  pageDrawing: '#c1dbe6',
  pageLine: '#81b4e6',
  ruleEmphasis: '#1f6a20',
  armor: '#465070',
  dangerStrong: '#ba0d26',
  danger: '#c01030',
  dangerText: '#c01030',
  dangerMuted: '#902538',
  dangerDeep: '#730a1d',
  dangerSurface: '#f4d4da',
  warning: '#b05000',
  warningStrong: '#b53d0e',
  warningText: '#9e4800',
  penalty: '#b05000',
  penaltyText: '#9e4800',
  success: '#1f7a30',
  successText: '#1d702c',
  secondary: '#0a7a70',
  secondaryStrong: '#08625a',
  secondaryText: '#096e65',
  onSecondary: '#021211',
  info: '#1f50c0',
  infoText: '#1f50c0',
  spell: '#8a2ac0',
  reference: '#2a2a50',
  paper: '#fffbea',
  paperShade: '#ebe7d7',
  onPaper: '#1a1a2a',
  pcToken: '#1f50c0',
});

// Every palette, with the MUI mode it is drawn in (which also sets how its
// inked lettering is lettered, LETTERINGS). A style draws its dark and its
// light mode in two of them (shapes.js SHAPE_STYLES `palettes`: comic in dark
// and light, the parchment; sci-fi in neon and neonLight; war in trench and
// dossier; gothic in dread and mist; astral in starlight and vellum; pirate
// in deepSea and seaChart; steampunk in foundry and patent; dwarven in forge
// and granite; fey in twilight and blossom; cosmic in abyss and asylum; pixel
// in arcade and cartridge).
export const PALETTES = Object.freeze({
  dark: Object.freeze({ id: 'dark', mode: 'dark', colors: COMIC_DARK }),
  light: Object.freeze({ id: 'light', mode: 'light', colors: PARCHMENT_LIGHT }),
  neon: Object.freeze({ id: 'neon', mode: 'dark', colors: NEON_DARK }),
  neonLight: Object.freeze({ id: 'neonLight', mode: 'light', colors: NEON_LIGHT }),
  trench: Object.freeze({ id: 'trench', mode: 'dark', colors: TRENCH_DARK }),
  dossier: Object.freeze({ id: 'dossier', mode: 'light', colors: DOSSIER_LIGHT }),
  dread: Object.freeze({ id: 'dread', mode: 'dark', colors: DREAD_DARK }),
  mist: Object.freeze({ id: 'mist', mode: 'light', colors: MIST_LIGHT }),
  starlight: Object.freeze({ id: 'starlight', mode: 'dark', colors: STARLIGHT_DARK }),
  vellum: Object.freeze({ id: 'vellum', mode: 'light', colors: VELLUM_LIGHT }),
  deepSea: Object.freeze({ id: 'deepSea', mode: 'dark', colors: DEEP_SEA_DARK }),
  seaChart: Object.freeze({ id: 'seaChart', mode: 'light', colors: SEA_CHART_LIGHT }),
  foundry: Object.freeze({ id: 'foundry', mode: 'dark', colors: FOUNDRY_DARK }),
  patent: Object.freeze({ id: 'patent', mode: 'light', colors: PATENT_LIGHT }),
  forge: Object.freeze({ id: 'forge', mode: 'dark', colors: FORGE_DARK }),
  granite: Object.freeze({ id: 'granite', mode: 'light', colors: GRANITE_LIGHT }),
  twilight: Object.freeze({ id: 'twilight', mode: 'dark', colors: TWILIGHT_DARK }),
  blossom: Object.freeze({ id: 'blossom', mode: 'light', colors: BLOSSOM_LIGHT }),
  abyss: Object.freeze({ id: 'abyss', mode: 'dark', colors: ABYSS_DARK }),
  asylum: Object.freeze({ id: 'asylum', mode: 'light', colors: ASYLUM_LIGHT }),
  arcade: Object.freeze({ id: 'arcade', mode: 'dark', colors: ARCADE_DARK }),
  cartridge: Object.freeze({ id: 'cartridge', mode: 'light', colors: CARTRIDGE_LIGHT }),
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
