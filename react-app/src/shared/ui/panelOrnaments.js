import { OPACITY, UI_COLORS, uiAlpha } from './colors.js';

// The drawings that decorate a panel's title bar, by the style (shapes.js):
// the ink along each cut end of the bar (ribbon.ends) and the title's
// flourish (panel.flourish). Each is an SVG in the palette's roles, drawn per
// style and palette by svgStylePicture (PanelHeader.jsx). What grips a whole
// panel, cut to its size, is panelGrip.js's.

// The ink along one end of a bar: the end's edge (`ends`, left end's points in
// a 10 by 100 box; the right end mirrored) stretched over the notch, the ink
// never scaled. Twice the ink edge: the clip cuts the outer half of the line.
export function barEndInkSvg(ends, side) {
  const points = side === 'left'
    ? ends
    : ends.split(' ').map((point) => {
      const [x, y] = point.split(',').map(Number);
      return `${10 - x},${y}`;
    }).join(' ');
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 100" preserveAspectRatio="none">'
    + `<polyline points="${points}" fill="none" stroke="${UI_COLORS.edge}" stroke-width="4" vector-effect="non-scaling-stroke" stroke-linejoin="miter"/></svg>`;
}

const svg = (width, height, body) => `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${body}</svg>`;

const FLOURISHES = Object.freeze({
  none: () => svg(1, 1, ''),
  // Astral: a fine line drawn out to a star.
  stars: () => svg(96, 16, [
    `<defs><linearGradient id="fade" x1="0" x2="1"><stop offset="0" stop-color="${UI_COLORS.accent}" stop-opacity="0"/><stop offset="1" stop-color="${UI_COLORS.accent}"/></linearGradient></defs>`,
    '<path d="M0 8 H78" stroke="url(#fade)" stroke-width="1.5"/>',
    `<circle cx="70" cy="8" r="1.8" fill="${UI_COLORS.accent}"/>`,
    `<path d="M88 1 L89.6 6.4 L95 8 L89.6 9.6 L88 15 L86.4 9.6 L81 8 L86.4 6.4 Z" fill="${UI_COLORS.accent}"/>`,
  ].join('')),
  // Steampunk: a brass rivet.
  rivets: () => svg(10, 10, [
    `<circle cx="5" cy="5" r="4" fill="${UI_COLORS.accent}" stroke="${UI_COLORS.edge}" stroke-width="1.2"/>`,
    `<circle cx="3.8" cy="3.8" r="1.3" fill="${uiAlpha(UI_COLORS.white, OPACITY.strong)}"/>`,
  ].join('')),
  // Fey: a curling vine in leaf, a blossom at its tip.
  vine: () => svg(96, 22, [
    `<path d="M0 15 C16 5 28 21 44 13 S72 5 84 12" stroke="${UI_COLORS.success}" stroke-width="1.6" fill="none" stroke-linecap="round"/>`,
    ...[[22, 10, -30], [50, 10, 25], [70, 7, -20]].map(([x, y, turn]) => `<path transform="translate(${x} ${y}) rotate(${turn})" d="M0 -5 C3.5 -2 3.5 2 0 5 C-3.5 2 -3.5 -2 0 -5 Z" fill="${UI_COLORS.success}"/>`),
    ...[0, 72, 144, 216, 288].map((turn) => `<circle cx="${(88 + 3.6 * Math.cos((turn * Math.PI) / 180)).toFixed(1)}" cy="${(12 + 3.6 * Math.sin((turn * Math.PI) / 180)).toFixed(1)}" r="2.6" fill="${UI_COLORS.accent}"/>`),
    `<circle cx="88" cy="12" r="1.6" fill="${UI_COLORS.warning}"/>`,
  ].join('')),
  // Cyberpunk: a glitch, a signal's bars torn sideways.
  glitch: () => svg(84, 14, [
    ...[[0, 2, 30, 3, 'accent'], [34, 2, 8, 3, 'info'], [10, 7, 46, 2, 'info'], [60, 7, 6, 2, 'accent'], [22, 11, 18, 2, 'danger'], [70, 2, 14, 3, 'accent'], [46, 11, 30, 2, 'accent']]
      .map(([x, y, w, h, role]) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${UI_COLORS[role]}"/>`),
  ].join('')),
});

// A title's flourish (shapes' panel.flourish.kind), drawn in the palette's roles.
export function flourishSvg(kind) {
  return (FLOURISHES[kind] || FLOURISHES.none)();
}

export const FLOURISH_KINDS = Object.freeze(Object.keys(FLOURISHES));
