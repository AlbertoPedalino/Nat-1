import { BASE_STYLE_ID } from './shapes.js';

// The interface's font stacks, from one place. The theme's body text uses
// `body`; titles, labels and numbers use `display`, a sturdy, lightly
// softened face that gives the interface its voice; longer flavour text uses
// `prose`; formulas and code use `mono`.
//
// Each style (shapes.js SHAPE_STYLES) letters the interface in its own faces
// (FONT_STYLES: its stacks and the stylesheet that loads them), so a role is
// the chosen style's CSS variable (UI_FONTS.display is
// `var(--gb-font-display)`), written on the page's root (fontVariables). What
// reads no CSS (a canvas's font) takes the style's stacks (fontStacks).
const COMIC_FONTS = Object.freeze({
  display: '"Rubik", system-ui, sans-serif',
  // Descriptive text read as a rulebook's: a feature's or spell's
  // description, a toast's message, a quiet note.
  prose: '"Alegreya", Georgia, serif',
  // The name on a card (an action, a spell, an item, a feature): the
  // rulebook's small capitals.
  cardName: '"Alegreya SC", "Alegreya", Georgia, serif',
  // The text of the interface (row names, lists, fields), in the rulebook's
  // face like the descriptions.
  body: '"Alegreya", Georgia, serif',
  // Comic lettering with a fantasy cut (a narrow, heavy face with blackletter
  // serifs): the voice, what happens in the moment (a roll, NATURAL 20!, a
  // toast) and the numeral on the home page's die.
  shout: '"Germania One", "Rubik", system-ui, sans-serif',
  // The sign, lettered like a rulebook's heading (a readable blackletter):
  // the names of places and people (pages, panels, dialogs, tools, scenes,
  // characters) and the app's own name on the home page's cover.
  // TEXT_STYLES.shout and .heading say which is which.
  heading: '"Grenze Gotisch", "Germania One", Georgia, serif',
  mono: '"JetBrains Mono", ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace',
});

// The sci-fi faces: a console's lettering. Orbitron for the voice and the
// signs, Rajdhani for labels and names, Exo 2 for the text, a terminal mono.
const SCIFI_FONTS = Object.freeze({
  display: '"Rajdhani", "Exo 2", system-ui, sans-serif',
  prose: '"Exo 2", system-ui, sans-serif',
  cardName: '"Rajdhani", "Exo 2", system-ui, sans-serif',
  body: '"Exo 2", system-ui, sans-serif',
  shout: '"Orbitron", "Rajdhani", system-ui, sans-serif',
  heading: '"Orbitron", "Rajdhani", system-ui, sans-serif',
  mono: '"Share Tech Mono", ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace',
});

// Every style's faces: `stacks` (the same roles as COMIC_FONTS) and the
// `stylesheet` that loads them. The base style's is linked by index.html, so
// it is there at the first paint; another style's is linked when it is chosen.
export const FONT_STYLES = Object.freeze({
  comic: Object.freeze({
    stacks: COMIC_FONTS,
    stylesheet: 'https://fonts.googleapis.com/css2?family=Alegreya:ital,wght@0,400..900;1,400..900&family=Alegreya+SC:wght@700&family=Germania+One&family=Grenze+Gotisch:wght@700;900&family=Rubik:wght@400;500;600;700;800&display=swap',
  }),
  scifi: Object.freeze({
    stacks: SCIFI_FONTS,
    stylesheet: 'https://fonts.googleapis.com/css2?family=Exo+2:ital,wght@0,400..800;1,400..800&family=Orbitron:wght@500;700;900&family=Rajdhani:wght@500;600;700&family=Share+Tech+Mono&display=swap',
  }),
});

function fontStyle(styleId) {
  return FONT_STYLES[styleId] || FONT_STYLES[BASE_STYLE_ID];
}

const fontVariableName = (role) => `--gb-font-${role.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`;

export const UI_FONTS = Object.freeze(Object.fromEntries(
  Object.keys(COMIC_FONTS).map((role) => [role, `var(${fontVariableName(role)})`]),
));

// A style's stacks by role, for a canvas.
export function fontStacks(styleId) {
  return fontStyle(styleId).stacks;
}

// The stylesheet a style's faces are loaded from.
export function fontStylesheet(styleId) {
  return fontStyle(styleId).stylesheet;
}

// The variables a style fills, { '--gb-font-display': '"Rubik", …', … }.
export function fontVariables(styleId) {
  return Object.fromEntries(Object.entries(fontStacks(styleId)).map(([role, stack]) => [fontVariableName(role), stack]));
}

// The type scale. Every font size in the interface is one of these steps, so a
// restyle changes the scale here. The sheet and builder are dense, hence the
// many small steps (8–14px); `body` and above are titles and headings. Sizes
// that follow a piece's own box (cqmin clamps on map tokens) or the parent
// text (em) are geometry, not type, and stay where they are drawn.
export const FONT_SIZES = Object.freeze({
  micro: '0.45rem',
  xxxs: '0.5rem',
  xxs: '0.56rem',
  xs: '0.62rem',
  sm: '0.66rem',
  md: '0.72rem',
  lg: '0.76rem',
  xl: '0.82rem',
  xxl: '0.875rem',
  body: '1rem',
  lead: '1.1rem',
  title: '1.25rem',
  heading: '1.5rem',
  display: '1.75rem',
  hero: '2rem',
});

// The two sizes of a control's label (buttons, tabs, keys, clickable chips):
// `normal` everywhere, `small` in a dense row of filters or tags.
export const CONTROL_FONT_SIZES = Object.freeze({
  normal: FONT_SIZES.sm,
  small: FONT_SIZES.xxs,
});

// Letter spacing of spaced-out text (uppercase labels and captions), in
// steps like the type scale. Ordinary text keeps the font's own spacing.
export const LETTER_SPACINGS = Object.freeze({
  sm: '0.04em',
  md: '0.06em',
  lg: '0.08em',
  xl: '0.1em',
  xxl: '0.12em',
});

// Font weights. Rubik and Alegreya draw regular to heavy; `black` is the
// heading face's heaviest cut, for the app's name on the home cover.
export const FONT_WEIGHTS = Object.freeze({
  regular: 400,
  semibold: 600,
  bold: 700,
  heavy: 800,
  black: 900,
});

// Line heights: `none` for figures and one-line chips, `tight`–`snug` for
// dense rows and labels, `normal` for body text, `relaxed` for prose.
export const LINE_HEIGHTS = Object.freeze({
  none: 1,
  tight: 1.15,
  snug: 1.25,
  normal: 1.4,
  relaxed: 1.6,
});
