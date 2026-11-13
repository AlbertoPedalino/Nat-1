// The interface's font stacks, from one place (all loaded in index.html). The theme's body text uses `body`; titles, labels and
// numbers use `display`, a sturdy, lightly softened face that gives the
// interface its voice; longer flavour text uses `prose`; formulas and code use
// `mono`.
export const UI_FONTS = Object.freeze({
  display: '"Rubik", "Nunito Sans", system-ui, sans-serif',
  prose: '"Nunito Sans", system-ui, sans-serif',
  body: '"Nunito Sans", system-ui, sans-serif',
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

// Font weights. Rubik and Nunito Sans draw all three.
export const FONT_WEIGHTS = Object.freeze({
  regular: 400,
  semibold: 600,
  bold: 700,
  heavy: 800,
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
