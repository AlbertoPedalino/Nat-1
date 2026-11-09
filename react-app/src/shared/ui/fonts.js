// The interface's font stacks, from one place (Cinzel and EB Garamond are
// loaded in index.html). The theme's body text uses `body`; titles, labels and
// numbers on the sheet use `display`; longer flavour text uses `prose`;
// formulas and code use `mono`.
export const UI_FONTS = Object.freeze({
  display: '"Cinzel", Georgia, serif',
  prose: '"EB Garamond", Georgia, serif',
  body: 'Georgia, "Times New Roman", serif',
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
