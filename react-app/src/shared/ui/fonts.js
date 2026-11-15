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

// The gothic faces: a haunted chronicle. Pirata One for the signs, Creepster
// dripping for the voice, Cinzel for labels, IM Fell for the old prose and
// the names, the comic's Alegreya kept for the interface's text.
const GOTHIC_FONTS = Object.freeze({
  display: '"Cinzel", Georgia, serif',
  prose: '"IM Fell English", Georgia, serif',
  cardName: '"IM Fell English SC", "IM Fell English", Georgia, serif',
  body: '"Alegreya", Georgia, serif',
  shout: '"Creepster", "Pirata One", Georgia, serif',
  heading: '"Pirata One", "IM Fell English SC", Georgia, serif',
  mono: '"JetBrains Mono", ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace',
});

// The war faces: a stencilled crate and a typed report. Black Ops One for
// the signs, Stardos Stencil for the voice, Oswald for labels and names,
// PT Serif for the text, a typewriter for the mono.
const WAR_FONTS = Object.freeze({
  display: '"Oswald", "Arial Narrow", sans-serif',
  prose: '"PT Serif", Georgia, serif',
  cardName: '"Oswald", "Arial Narrow", sans-serif',
  body: '"PT Serif", Georgia, serif',
  shout: '"Stardos Stencil", "Black Ops One", "Arial Narrow", sans-serif',
  heading: '"Black Ops One", "Stardos Stencil", "Arial Narrow", sans-serif',
  mono: '"Special Elite", "Courier New", monospace',
});

// How large each lettering is drawn against its size (CSS font-size-adjust),
// by role: the comic faces' own, which the sizes were chosen for. A style's
// faces are fitted to them (FONT_STYLES `fits`, over these), so a size reads
// the same in every style: a narrow or short face (a blackletter, a
// condensed sign) is drawn larger, a wide one smaller, where a label or a
// title has the room the comic's had. Every role a TEXT_STYLES treatment
// fits: `body` (the theme's text, Alegreya's short lower case raised),
// `heading`, `figure` (and the tag on its chip), `caps` (the label's small
// capitals: a variable named …label breaks Emotion), `shout`, `cover`.
const COMIC_FITS = Object.freeze({
  body: 'ex-height 0.52',
  heading: 'ex-height 0.55',
  figure: 'cap-height 0.92',
  caps: 'none',
  shout: 'none',
  cover: 'none',
});

// Every style's faces: `stacks` (the same roles as COMIC_FONTS) and the
// `stylesheet` that loads them. The base style's is linked by index.html, so
// it is there at the first paint; another style's is linked when it is chosen.
export const FONT_STYLES = Object.freeze({
  comic: Object.freeze({
    stacks: COMIC_FONTS,
    stylesheet: 'https://fonts.googleapis.com/css2?family=Alegreya:ital,wght@0,400..900;1,400..900&family=Alegreya+SC:wght@700&family=Germania+One&family=Grenze+Gotisch:wght@700;900&family=Rubik:wght@400;500;600;700;800&display=swap',
  }),
  gothic: Object.freeze({
    stacks: GOTHIC_FONTS,
    fits: Object.freeze({ heading: 'ex-height 0.72' }),
    stylesheet: 'https://fonts.googleapis.com/css2?family=Alegreya:ital,wght@0,400..900;1,400..900&family=Cinzel:wght@500;700&family=Creepster&family=IM+Fell+English:ital@0;1&family=IM+Fell+English+SC&family=Pirata+One&display=swap',
  }),
  war: Object.freeze({
    stacks: WAR_FONTS,
    fits: Object.freeze({ heading: 'ex-height 0.5' }),
    stylesheet: 'https://fonts.googleapis.com/css2?family=Black+Ops+One&family=Oswald:wght@400;500;600;700&family=PT+Serif:ital,wght@0,400;0,700;1,400&family=Special+Elite&family=Stardos+Stencil:wght@400;700&display=swap',
  }),
  scifi: Object.freeze({
    stacks: SCIFI_FONTS,
    fits: Object.freeze({ heading: 'ex-height 0.5', caps: 'cap-height 0.7' }),
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

// A lettering role's fit as the chosen style's CSS variable (COMIC_FITS).
const fitVariableName = (role) => `--gb-${role}-size-fit`;
export const FONT_FITS = Object.freeze(Object.fromEntries(
  Object.keys(COMIC_FITS).map((role) => [role, `var(${fitVariableName(role)})`]),
));

// The variables a style fills, { '--gb-font-display': '"Rubik", …', … }: its
// stacks and its fits.
export function fontVariables(styleId) {
  const fits = { ...COMIC_FITS, ...fontStyle(styleId).fits };
  return {
    ...Object.fromEntries(Object.entries(fontStacks(styleId)).map(([role, stack]) => [fontVariableName(role), stack])),
    ...Object.fromEntries(Object.entries(fits).map(([role, fit]) => [fitVariableName(role), fit])),
  };
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
