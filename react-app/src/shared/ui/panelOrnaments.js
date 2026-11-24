import { UI_COLORS } from './colors.js';

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
  // Superhero: speed lines trailing a lightning bolt.
  bolt: () => svg(64, 20, [
    ...[[0, 6, 30], [8, 10, 32], [4, 14, 30]].map(([x, y, w]) => `<path d="M${x} ${y} H${x + w}" stroke="${UI_COLORS.edge}" stroke-width="1.6" stroke-linecap="round"/>`),
    `<path d="M52 1 L40 11 H47 L43 19 L57 8 H50 L55 1 Z" fill="${UI_COLORS.accent}" stroke="${UI_COLORS.edge}" stroke-width="1.4" stroke-linejoin="round"/>`,
  ].join('')),
});

// A title's flourish (shapes' panel.flourish.kind), drawn in the palette's roles.
export function flourishSvg(kind) {
  return (FLOURISHES[kind] || FLOURISHES.none)();
}

export const FLOURISH_KINDS = Object.freeze(Object.keys(FLOURISHES));
