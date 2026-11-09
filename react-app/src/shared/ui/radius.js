// Corners that meet another surface (a strip under a card, a tab on a panel's
// edge) are given per corner as multiples of the theme radius, like sx's own
// numeric borderRadius, so they follow theme.shape.borderRadius.
export const cornerRadius = (topLeft, topRight, bottomRight, bottomLeft) => (theme) =>
  [topLeft, topRight, bottomRight, bottomLeft].map((m) => `${m * theme.shape.borderRadius}px`).join(' ');
