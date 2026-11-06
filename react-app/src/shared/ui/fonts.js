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
