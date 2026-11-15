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

// The steampunk style's dark palette, the foundry: verdigris-stained
// steel, polished brass, copper's teal patina.
const FOUNDRY_DARK = Object.freeze({
  ...COMIC_DARK,
  accent: '#d9a441',
  accentText: '#e4bf7a',
  accentHighlight: '#f0dbb3',
  accentMuted: '#98732e',
  accentPlain: '#d9a441',
  onAccent: '#21190a',
  textPrimary: '#f0e8d6',
  textSecondary: '#b4b3a7',
  textMuted: '#909389',
  textFaint: '#656c65',
  outline: '#535c56',
  surfaceRaised: '#1b2a29',
  bubble: '#394645',
  surfaceHeader: '#162625',
  surface: '#10201f',
  surfaceDeep: '#0e1c1b',
  page: '#081312',
  surfaceSunken: '#060f0e',
  surfaceDarkest: '#050b0a',
  edge: '#040908',
  onFill: '#040908',
  pageDrawing: '#1b2a29',
  pageLine: '#040908',
  ruleEmphasis: '#e0c080',
  armor: '#a8b8b8',
  dangerStrong: '#ff4c37',
  danger: '#ff5f45',
  dangerText: '#ff9786',
  dangerMuted: '#e1816c',
  dangerDeep: '#993929',
  dangerSurface: '#2b1e19',
  warning: '#ff8f3a',
  warningStrong: '#ff813d',
  warningText: '#ffb67f',
  penalty: '#ff8f3a',
  penaltyText: '#ffb67f',
  success: '#6fd0a0',
  successText: '#a1e0c1',
  secondary: '#5fd4c4',
  secondaryStrong: '#4caa9d',
  secondaryText: '#8fe1d6',
  onSecondary: '#0e201d',
  info: '#7ab8d8',
  infoText: '#a9d1e6',
  spell: '#c79aff',
  reference: '#e8d9b5',
  paper: '#efe2c4',
  paperShade: '#dcd0b4',
  onPaper: '#3a2a12',
  pcToken: '#7ab8d8',
});

// The steampunk style's light palette, the patent: a blueprint's blue under
// cream drawing sheets, brass and verdigris ink.
const PATENT_LIGHT = Object.freeze({
  ...COMIC_DARK,
  accent: '#c8901f',
  accentText: '#6f5011',
  accentHighlight: '#eedebc',
  accentMuted: '#8c6516',
  accentPlain: '#705111',
  onAccent: '#1e1605',
  textPrimary: '#14202c',
  textSecondary: '#363d43',
  textMuted: '#50565c',
  textFaint: '#9ba3aa',
  outline: '#adb4ba',
  surfaceRaised: '#f6f9fb',
  bubble: '#fafbfd',
  surfaceHeader: '#c0d1e2',
  surface: '#eef3f7',
  surfaceDeep: '#dae5f0',
  page: '#7fa6cf',
  surfaceSunken: '#bcd0e5',
  surfaceDarkest: '#779cc3',
  edge: '#0e161f',
  onFill: '#0e161f',
  pageDrawing: '#b1c9e1',
  pageLine: '#7295ba',
  ruleEmphasis: '#0d615a',
  armor: '#3e5266',
  dangerStrong: '#ad2015',
  danger: '#b0281a',
  dangerText: '#a52618',
  dangerMuted: '#7f302a',
  dangerDeep: '#6a1810',
  dangerSurface: '#f1d8d6',
  warning: '#9a5a0a',
  warningStrong: '#a14b0f',
  warningText: '#7e4a08',
  penalty: '#9a5a0a',
  penaltyText: '#7e4a08',
  success: '#1f6e50',
  successText: '#1b6146',
  secondary: '#0f6e66',
  secondaryStrong: '#0c5852',
  secondaryText: '#0d615a',
  onSecondary: '#02100f',
  info: '#1f4f8a',
  infoText: '#1f4f8a',
  spell: '#5e3a86',
  reference: '#1e2f40',
  paper: '#fbf8ef',
  paperShade: '#e7e4dc',
  onPaper: '#14202c',
  pcToken: '#1f4f8a',
});

// The dwarven style's dark palette, the forge: slate-blue stone under the
// mountain, embers for what matters, the hoard's gold for a rule.
const FORGE_DARK = Object.freeze({
  ...COMIC_DARK,
  accent: '#ff7a1a',
  accentText: '#ffa25f',
  accentHighlight: '#ffcaa3',
  accentMuted: '#b25512',
  accentPlain: '#ff7a1a',
  onAccent: '#261204',
  textPrimary: '#eef0f4',
  textSecondary: '#b1b4b9',
  textMuted: '#8f9298',
  textFaint: '#6b6e75',
  outline: '#5a5e64',
  surfaceRaised: '#242931',
  bubble: '#41454c',
  surfaceHeader: '#20252c',
  surface: '#1a1f27',
  surfaceDeep: '#161b22',
  page: '#0f1218',
  surfaceSunken: '#0c0e12',
  surfaceDarkest: '#090a0e',
  edge: '#07080b',
  onFill: '#07080b',
  pageDrawing: '#242931',
  pageLine: '#07080b',
  ruleEmphasis: '#ffd27a',
  armor: '#b8c4d4',
  dangerStrong: '#ff3b31',
  danger: '#ff4a3d',
  dangerText: '#ff8981',
  dangerMuted: '#e0746f',
  dangerDeep: '#992c25',
  dangerSurface: '#311a1d',
  warning: '#ffc04a',
  warningStrong: '#ff9d46',
  warningText: '#ffd689',
  penalty: '#ffc04a',
  penaltyText: '#ffd689',
  success: '#7fcf8a',
  successText: '#ace0b3',
  secondary: '#a8d86a',
  secondaryStrong: '#86ad55',
  secondaryText: '#c2e497',
  onSecondary: '#192010',
  info: '#7ab0e8',
  infoText: '#a9ccf0',
  spell: '#b98aff',
  reference: '#dfe4ec',
  paper: '#e2dccf',
  paperShade: '#d0cabe',
  onPaper: '#2a2018',
  pcToken: '#7ab0e8',
});

// The dwarven style's light palette, granite: pale cut stone over slate,
// iron ink, the forge's ember.
const GRANITE_LIGHT = Object.freeze({
  ...COMIC_DARK,
  accent: '#c2480e',
  accentText: '#92360a',
  accentHighlight: '#edc8b7',
  accentMuted: '#88320a',
  accentPlain: '#90350a',
  onAccent: '#ffffff',
  textPrimary: '#151a22',
  textSecondary: '#35383c',
  textMuted: '#515458',
  textFaint: '#9c9fa5',
  outline: '#adb0b6',
  surfaceRaised: '#f6f8fa',
  bubble: '#fafbfc',
  surfaceHeader: '#c3cbd5',
  surface: '#eef1f5',
  surfaceDeep: '#dde1e8',
  page: '#8e9aac',
  surfaceSunken: '#c3cad4',
  surfaceDarkest: '#8591a2',
  edge: '#0f1218',
  onFill: '#0f1218',
  pageDrawing: '#b9c1cd',
  pageLine: '#808b9b',
  ruleEmphasis: '#734b00',
  armor: '#3e4a5a',
  dangerStrong: '#b31a15',
  danger: '#b8201a',
  dangerText: '#a21c17',
  dangerMuted: '#842a28',
  dangerDeep: '#6e1310',
  dangerSurface: '#f2d7d6',
  warning: '#8a5a00',
  warningStrong: '#984908',
  warningText: '#744c00',
  penalty: '#8a5a00',
  penaltyText: '#744c00',
  success: '#2e6e3a',
  successText: '#285f32',
  secondary: '#4f6a14',
  secondaryStrong: '#3f5510',
  secondaryText: '#445b11',
  onSecondary: '#0c1003',
  info: '#2f5a90',
  infoText: '#2c5587',
  spell: '#5e3a86',
  reference: '#2a3240',
  paper: '#faf7f0',
  paperShade: '#e6e3dd',
  onPaper: '#2a2018',
  pcToken: '#2f5a90',
});

// The fey style's dark palette, twilight: a violet dusk in the fair folk's
// wood, fairy-light mint, pink blossom, fairy gold for a rule.
const TWILIGHT_DARK = Object.freeze({
  ...COMIC_DARK,
  accent: '#7dffc4',
  accentText: '#a4ffd6',
  accentHighlight: '#cbffe7',
  accentMuted: '#58b289',
  accentPlain: '#7dffc4',
  onAccent: '#13261d',
  textPrimary: '#f3eefc',
  textSecondary: '#b3adc0',
  textMuted: '#938ca2',
  textFaint: '#6e677f',
  outline: '#5d566f',
  surfaceRaised: '#27203c',
  bubble: '#433d56',
  surfaceHeader: '#231b38',
  surface: '#1d1533',
  surfaceDeep: '#19122c',
  page: '#110b22',
  surfaceSunken: '#0d081a',
  surfaceDarkest: '#0a0614',
  edge: '#08050f',
  onFill: '#08050f',
  pageDrawing: '#27203c',
  pageLine: '#08050f',
  ruleEmphasis: '#ffd36e',
  armor: '#c0c8e0',
  dangerStrong: '#ff486e',
  danger: '#ff5a8a',
  dangerText: '#ff94b3',
  dangerMuted: '#e17ba0',
  dangerDeep: '#993653',
  dangerSurface: '#321631',
  warning: '#ffc94a',
  warningStrong: '#ffa85d',
  warningText: '#ffdc89',
  penalty: '#ffc94a',
  penaltyText: '#ffdc89',
  success: '#9be07a',
  successText: '#beeba9',
  secondary: '#ff8ad8',
  secondaryStrong: '#cc6ead',
  secondaryText: '#ffade4',
  onSecondary: '#261520',
  info: '#7ac8ff',
  infoText: '#a9dbff',
  spell: '#c89aff',
  reference: '#ece4ff',
  paper: '#f3ecd8',
  paperShade: '#e0d9c7',
  onPaper: '#2a2414',
  pcToken: '#7ac8ff',
});

// The fey style's light palette, blossom: lilac petals over spring grass,
// magenta and violet ink.
const BLOSSOM_LIGHT = Object.freeze({
  ...COMIC_DARK,
  accent: '#c2187a',
  accentText: '#92125c',
  accentHighlight: '#edbad7',
  accentMuted: '#881155',
  accentPlain: '#9b1362',
  onAccent: '#ffffff',
  textPrimary: '#24123a',
  textSecondary: '#3c3446',
  textMuted: '#584f60',
  textFaint: '#a99eb2',
  outline: '#bab0c1',
  surfaceRaised: '#fdf9fd',
  bubble: '#fefbfe',
  surfaceHeader: '#ecbad9',
  surface: '#fbf3fb',
  surfaceDeep: '#f0f0ed',
  page: '#bfe3ab',
  surfaceSunken: '#e0ecd7',
  surfaceDarkest: '#b4d5a1',
  edge: '#190d29',
  onFill: '#190d29',
  pageDrawing: '#daeacf',
  pageLine: '#accc9a',
  ruleEmphasis: '#694d00',
  armor: '#4a4e6a',
  dangerStrong: '#b31a25',
  danger: '#b8202e',
  dangerText: '#a21c28',
  dangerMuted: '#862838',
  dangerDeep: '#6e131c',
  dangerSurface: '#f2d7d9',
  warning: '#8a6000',
  warningStrong: '#984d0e',
  warningText: '#6e4d00',
  penalty: '#8a6000',
  penaltyText: '#6e4d00',
  success: '#2a7038',
  successText: '#235e2f',
  secondary: '#5a3fc0',
  secondaryStrong: '#48329a',
  secondaryText: '#563cb8',
  onSecondary: '#0e091d',
  info: '#1f5f90',
  infoText: '#1c5682',
  spell: '#6a3a96',
  reference: '#3a2a50',
  paper: '#fffaf0',
  paperShade: '#ebe6dd',
  onPaper: '#2a2414',
  pcToken: '#1f5f90',
});

// The cosmic style's dark palette, the void: the black between the stars,
// a violet nebula's dark, the acid glow of what watches from beyond,
// magenta for an edge.
const VOID_DARK = Object.freeze({
  ...COMIC_DARK,
  accent: '#b6ff3c',
  accentText: '#ccff76',
  accentHighlight: '#e2ffb1',
  accentMuted: '#7fb22a',
  accentPlain: '#b6ff3c',
  onAccent: '#1b2609',
  textPrimary: '#ece6f6',
  textSecondary: '#aea8b9',
  textMuted: '#8c8698',
  textFaint: '#686275',
  outline: '#575164',
  surfaceRaised: '#211c30',
  bubble: '#3e394b',
  surfaceHeader: '#1d172b',
  surface: '#171126',
  surfaceDeep: '#140f21',
  page: '#0a0614',
  surfaceSunken: '#08050f',
  surfaceDarkest: '#06030c',
  edge: '#040309',
  onFill: '#040309',
  pageDrawing: '#211c30',
  pageLine: '#040309',
  ruleEmphasis: '#c08aff',
  armor: '#a8a0c8',
  dangerStrong: '#ff3b55',
  danger: '#ff4a6a',
  dangerText: '#ff899e',
  dangerMuted: '#df708a',
  dangerDeep: '#992c40',
  dangerSurface: '#2c1020',
  warning: '#e8c050',
  warningStrong: '#ef9d58',
  warningText: '#f0d68d',
  penalty: '#e8c050',
  penaltyText: '#f0d68d',
  success: '#3fe0b0',
  successText: '#82ebcc',
  secondary: '#ff5ad1',
  secondaryStrong: '#cc48a7',
  secondaryText: '#ff8cdf',
  onSecondary: '#260e1f',
  info: '#6aa0ff',
  infoText: '#9ec1ff',
  spell: '#b27aff',
  reference: '#e0d8f0',
  paper: '#ddd8c8',
  paperShade: '#cbc7b8',
  onPaper: '#1e1a28',
  pcToken: '#6aa0ff',
});

// The cosmic style's light palette, the asylum: a ward's bilious green
// walls, a case file's paper, bile and violet ink.
const ASYLUM_LIGHT = Object.freeze({
  ...COMIC_DARK,
  accent: '#5a8f00',
  accentText: '#3f6200',
  accentHighlight: '#ceddb2',
  accentMuted: '#3f6400',
  accentPlain: '#3d6100',
  onAccent: '#0e1500',
  textPrimary: '#0e1a14',
  textSecondary: '#39403a',
  textMuted: '#555b54',
  textFaint: '#99a096',
  outline: '#abb1a7',
  surfaceRaised: '#f6f8f2',
  bubble: '#fafbf8',
  surfaceHeader: '#c8d8aa',
  surface: '#eef2e6',
  surfaceDeep: '#dde5d5',
  page: '#8faa86',
  surfaceSunken: '#c3d2bb',
  surfaceDarkest: '#86a07e',
  edge: '#0a120e',
  onFill: '#0a120e',
  pageDrawing: '#bacab1',
  pageLine: '#819979',
  ruleEmphasis: '#6a2e9a',
  armor: '#405a50',
  dangerStrong: '#a00d25',
  danger: '#a0102e',
  dangerText: '#a0102e',
  dangerMuted: '#772333',
  dangerDeep: '#600a1c',
  dangerSurface: '#eed4d9',
  warning: '#7a5a00',
  warningStrong: '#85440e',
  warningText: '#705300',
  penalty: '#7a5a00',
  penaltyText: '#705300',
  success: '#0f6e5a',
  successText: '#0e6553',
  secondary: '#6a2e9a',
  secondaryStrong: '#55257b',
  secondaryText: '#6a2e9a',
  onSecondary: '#100717',
  info: '#1f4e8a',
  infoText: '#1f4e8a',
  spell: '#5a2e96',
  reference: '#1e2e28',
  paper: '#f4f2e2',
  paperShade: '#e0dfd0',
  onPaper: '#1e2420',
  pcToken: '#1f4e8a',
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

// The cyberpunk style's dark palette, overdrive: a megacity at night.
// Black glass, electric yellow, cyan signs, hot red, magenta for an edge.
const OVERDRIVE_DARK = Object.freeze({
  ...COMIC_DARK,
  accent: '#fcee0a',
  accentText: '#fdf354',
  accentHighlight: '#fef89d',
  accentMuted: '#b0a707',
  accentPlain: '#fcee0a',
  onAccent: '#262402',
  textPrimary: '#f2f6f0',
  textSecondary: '#aeb3b0',
  textMuted: '#8c9190',
  textFaint: '#666b6b',
  outline: '#54595a',
  surfaceRaised: '#1b2024',
  bubble: '#393e41',
  surfaceHeader: '#161c20',
  surface: '#10161a',
  surfaceDeep: '#0e1316',
  page: '#06090b',
  surfaceSunken: '#050708',
  surfaceDarkest: '#030506',
  edge: '#030405',
  onFill: '#030405',
  pageDrawing: '#1b2024',
  pageLine: '#030405',
  ruleEmphasis: '#5ef0ff',
  armor: '#9fb2c0',
  dangerStrong: '#ff223e',
  danger: '#ff2a4d',
  dangerText: '#ff758b',
  dangerMuted: '#df6175',
  dangerDeep: '#99192e',
  dangerSurface: '#290e14',
  warning: '#ff8a00',
  warningStrong: '#ff6d17',
  warningText: '#ffb359',
  penalty: '#ff8a00',
  penaltyText: '#ffb359',
  success: '#2cf28a',
  successText: '#76f7b3',
  secondary: '#ff3df2',
  secondaryStrong: '#cc31c2',
  secondaryText: '#ff77f6',
  onSecondary: '#260924',
  info: '#00e5ff',
  infoText: '#59eeff',
  spell: '#b06cff',
  reference: '#e6f0ea',
  paper: '#e8eadf',
  paperShade: '#d5d7cd',
  onPaper: '#111417',
  pcToken: '#00e5ff',
});

// The cyberpunk style's light palette, daylight: a district by day, hazard
// yellow over concrete, black and cyan ink.
const DAYLIGHT_LIGHT = Object.freeze({
  ...COMIC_DARK,
  accent: '#f5d400',
  accentText: '#766600',
  accentHighlight: '#fcf2b2',
  accentMuted: '#ac9400',
  accentPlain: '#766600',
  onAccent: '#252000',
  textPrimary: '#111417',
  textSecondary: '#4c4d4c',
  textMuted: '#676965',
  textFaint: '#a0a099',
  outline: '#b2b2a9',
  surfaceRaised: '#fbfaf4',
  bubble: '#fdfcf8',
  surfaceHeader: '#f6edac',
  surface: '#f7f6e8',
  surfaceDeep: '#f4f1cc',
  page: '#e6dc4e',
  surfaceSunken: '#efeaa3',
  surfaceDarkest: '#d8cf49',
  edge: '#0c0e10',
  onFill: '#0c0e10',
  pageDrawing: '#eee893',
  pageLine: '#cfc646',
  ruleEmphasis: '#006f8a',
  armor: '#3c4b57',
  dangerStrong: '#bd0026',
  danger: '#c4002f',
  dangerText: '#c4002f',
  dangerMuted: '#941f3b',
  dangerDeep: '#76001c',
  dangerSurface: '#f4d1da',
  warning: '#b35a00',
  warningStrong: '#b83f0e',
  warningText: '#a15100',
  penalty: '#b35a00',
  penaltyText: '#a15100',
  success: '#0a7a45',
  successText: '#0a7844',
  secondary: '#b0009f',
  secondaryStrong: '#8d007f',
  secondaryText: '#b0009f',
  onSecondary: '#1a0018',
  info: '#006f8a',
  infoText: '#006f8a',
  spell: '#6a2ac0',
  reference: '#1e2a30',
  paper: '#ffffff',
  paperShade: '#ebebeb',
  onPaper: '#111417',
  pcToken: '#006f8a',
});

// The war style's dark palette, the trench: olive drab in the mud, khaki
// lettering, blood red for what matters, brass.
const TRENCH_DARK = Object.freeze({
  ...COMIC_DARK,
  accent: '#d32f2f',
  accentText: '#e06d6d',
  accentHighlight: '#edacac',
  accentMuted: '#942121',
  accentPlain: '#e06d6d',
  onAccent: '#ffffff',
  textPrimary: '#ecebd8',
  textSecondary: '#b4b4a6',
  textMuted: '#909183',
  textFaint: '#6a6d5f',
  outline: '#595c50',
  surfaceRaised: '#242920',
  bubble: '#41453d',
  surfaceHeader: '#20251b',
  surface: '#1a1f15',
  surfaceDeep: '#161b12',
  page: '#0f120b',
  surfaceSunken: '#0c0e08',
  surfaceDarkest: '#090a06',
  edge: '#070805',
  onFill: '#070805',
  pageDrawing: '#242920',
  pageLine: '#070805',
  ruleEmphasis: '#d8c27a',
  armor: '#a3ab90',
  dangerStrong: '#ff4830',
  danger: '#ff5a3c',
  dangerText: '#ff9480',
  dangerMuted: '#e17e66',
  dangerDeep: '#993624',
  dangerSurface: '#311c12',
  warning: '#e8b04a',
  warningStrong: '#ef9646',
  warningText: '#f0cc89',
  penalty: '#e8b04a',
  penaltyText: '#f0cc89',
  success: '#8fbf5a',
  successText: '#b6d594',
  secondary: '#b5c96a',
  secondaryStrong: '#91a155',
  secondaryText: '#cbd997',
  onSecondary: '#1b1e10',
  info: '#8fb0c8',
  infoText: '#b6ccdb',
  spell: '#b08ad8',
  reference: '#e3dcc0',
  paper: '#e6dcbc',
  paperShade: '#d4caad',
  onPaper: '#2a2410',
  pcToken: '#8fb0c8',
});

// The war style's light palette, the dossier: pale khaki forms on an olive
// drab desk, red stamps.
const DOSSIER_LIGHT = Object.freeze({
  ...COMIC_DARK,
  accent: '#a51d1d',
  accentText: '#7c1616',
  accentHighlight: '#e4bbbb',
  accentMuted: '#741414',
  accentPlain: '#a51d1d',
  onAccent: '#ffffff',
  textPrimary: '#1c1f12',
  textSecondary: '#3a3c33',
  textMuted: '#55584e',
  textFaint: '#9ea192',
  outline: '#afb1a2',
  surfaceRaised: '#f6f8f0',
  bubble: '#fafaf6',
  surfaceHeader: '#ccd1b5',
  surface: '#eef0e0',
  surfaceDeep: '#e2e4d1',
  page: '#a9b08a',
  surfaceSunken: '#cfd3b9',
  surfaceDarkest: '#9fa582',
  edge: '#14160d',
  onFill: '#14160d',
  pageDrawing: '#c8cdb1',
  pageLine: '#989e7c',
  ruleEmphasis: '#585810',
  armor: '#46523a',
  dangerStrong: '#ad1d15',
  danger: '#b0241a',
  dangerText: '#a52218',
  dangerMuted: '#812e24',
  dangerDeep: '#6a1610',
  dangerSurface: '#f1d8d6',
  warning: '#8a6200',
  warningStrong: '#954f08',
  warningText: '#715000',
  penalty: '#8a6200',
  penaltyText: '#715000',
  success: '#3f6a1f',
  successText: '#395f1c',
  secondary: '#4a5e14',
  secondaryStrong: '#3b4b10',
  secondaryText: '#4a5e14',
  onSecondary: '#0b0e03',
  info: '#2f5a70',
  infoText: '#2f5a70',
  spell: '#5e3a86',
  reference: '#3a3a20',
  paper: '#f6f1dc',
  paperShade: '#e2deca',
  onPaper: '#2a2410',
  pcToken: '#2f5a70',
});

// Every palette, with the MUI mode it is drawn in (which also sets how its
// inked lettering is lettered, LETTERINGS). A style draws its dark and its
// light mode in two of them (shapes.js SHAPE_STYLES `palettes`: comic in dark
// and light, the parchment; sci-fi in neon and neonLight; war in trench and
// dossier; gothic in dread and mist; astral in starlight and vellum; pirate
// in deepSea and seaChart; steampunk in foundry and patent; dwarven in forge
// and granite; fey in twilight and blossom; cosmic in void and asylum; pixel
// in arcade and cartridge; cyberpunk in overdrive and daylight).
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
  void: Object.freeze({ id: 'void', mode: 'dark', colors: VOID_DARK }),
  asylum: Object.freeze({ id: 'asylum', mode: 'light', colors: ASYLUM_LIGHT }),
  arcade: Object.freeze({ id: 'arcade', mode: 'dark', colors: ARCADE_DARK }),
  cartridge: Object.freeze({ id: 'cartridge', mode: 'light', colors: CARTRIDGE_LIGHT }),
  overdrive: Object.freeze({ id: 'overdrive', mode: 'dark', colors: OVERDRIVE_DARK }),
  daylight: Object.freeze({ id: 'daylight', mode: 'light', colors: DAYLIGHT_LIGHT }),
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

// A hex's red, green and blue, 0-255.
export function hexChannels(hex) {
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
