import { OPACITY, UI_COLORS, uiAlpha } from './colors.js';
import { TRIM_TILE } from './shapes.js';

// The drawings that decorate a panel's title bar, by the style (shapes.js):
// the ink along each cut end of the bar (ribbon.ends), the title's flourish
// and the trim along the bar's foot (panel.flourish). Each is an SVG in the palette's roles, drawn per
// style and palette by svgStylePicture (PanelHeader.jsx).

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
  // Abyssal: a tentacle's tip coiling up from the bar (tentacleSvg).
  tentacle: () => tentacleSvg(),
});

// A title's flourish (shapes' panel.flourish.kind), drawn in the palette's roles.
export function flourishSvg(kind) {
  return (FLOURISHES[kind] || FLOURISHES.none)();
}

export const FLOURISH_KINDS = Object.freeze(Object.keys(FLOURISHES));

const r1 = (value) => Math.round(value * 10) / 10;

// A tentacle's tip, drawn rather than stylised: a centreline that runs in from
// the left and coils up into a spiral at the right, a body tapering along it to
// a point, shaded on one side and lit along the other, suckers along its
// underside shrinking to the tip, and the base fading into the bar it comes
// out of. In the palette's roles: the accent's body, its muted shade and
// highlight, pale suckers ringed in a bruised red.
function tentacleSvg({ width = 104, height = 44 } = {}) {
  const steps = 90;
  const straight = 0.4;
  const cx = width * 0.74;
  const cy = height * 0.46;
  const reach = height * 0.36;
  const line = Array.from({ length: steps + 1 }, (_, i) => {
    const t = i / steps;
    if (t <= straight) {
      const u = t / straight;
      return [u * cx, cy + reach - Math.sin(u * Math.PI) * height * 0.04];
    }
    const u = (t - straight) / (1 - straight);
    // From under the coil, round its right and up and in.
    const angle = Math.PI / 2 - u * Math.PI * 1.85;
    const r = reach * (1 - u * 0.8);
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
  });
  const thick = (t) => height * 0.42 * (1 - t) ** 0.8 + 0.6;
  const normals = line.map((_, i) => {
    const [ax, ay] = line[Math.max(0, i - 1)];
    const [bx, by] = line[Math.min(steps, i + 1)];
    const length = Math.hypot(bx - ax, by - ay) || 1;
    return [-(by - ay) / length, (bx - ax) / length];
  });
  const side = (sign, share = 1) => line.map(([x, y], i) => {
    const half = (thick(i / steps) / 2) * share;
    return [x + sign * normals[i][0] * half, y + sign * normals[i][1] * half];
  });
  const path = (points) => points.map(([x, y], i) => `${i ? 'L' : 'M'}${r1(x)} ${r1(y)}`).join(' ');
  const closed = (one, other) => `${path(one)} ${path([...other].reverse()).replace('M', 'L')} Z`;
  const outline = closed(side(1), side(-1));
  const suckers = [];
  for (let i = 4; i < steps - 8; i += 6) {
    const w = thick(i / steps);
    const [x, y] = line[i];
    const [nx, ny] = normals[i];
    const r = Math.max(0.7, w * 0.17);
    suckers.push(`<circle cx="${r1(x + nx * w * 0.28)}" cy="${r1(y + ny * w * 0.28)}" r="${r1(r)}" fill="${UI_COLORS.paper}" stroke="${UI_COLORS.dangerMuted}" stroke-width="${r1(r * 0.45)}"/>`);
  }
  return svg(width, height, [
    // The base fades into the bar it comes out of.
    `<defs><linearGradient id="in" x1="0" x2="1"><stop offset="0" stop-color="${UI_COLORS.white}" stop-opacity="0"/><stop offset="0.22" stop-color="${UI_COLORS.white}"/></linearGradient>`
      + '<mask id="fade"><rect width="100%" height="100%" fill="url(#in)"/></mask></defs>',
    '<g mask="url(#fade)">',
    `<path d="${outline}" fill="${UI_COLORS.accent}"/>`,
    `<path d="${closed(side(1), side(0.1))}" fill="${UI_COLORS.accentMuted}" opacity="${OPACITY.heavy}"/>`,
    `<path d="${path(side(-1, 0.5).slice(0, Math.round(steps * 0.9)))}" fill="none" stroke="${UI_COLORS.accentHighlight}" stroke-width="1.4" stroke-linecap="round" opacity="${OPACITY.heavy}"/>`,
    ...suckers,
    `<path d="${outline}" fill="none" stroke="${UI_COLORS.edge}" stroke-width="1.6" stroke-linejoin="round"/>`,
    '</g>',
  ].join(''));
}

const TRIMS = Object.freeze({
  none: () => svg(1, 1, ''),
  // A tentacle's underside: a sucker in every tile, rising from the bar's foot.
  suckers: () => svg(TRIM_TILE.width, TRIM_TILE.height, [
    `<ellipse cx="${TRIM_TILE.width / 2}" cy="${TRIM_TILE.height}" rx="${TRIM_TILE.width * 0.26}" ry="${TRIM_TILE.height * 0.62}" fill="${UI_COLORS.paper}" stroke="${UI_COLORS.dangerMuted}" stroke-width="1.6"/>`,
    `<ellipse cx="${TRIM_TILE.width / 2}" cy="${TRIM_TILE.height}" rx="${TRIM_TILE.width * 0.1}" ry="${TRIM_TILE.height * 0.26}" fill="${UI_COLORS.dangerMuted}"/>`,
  ].join('')),
});

// A bar's trim (shapes' panel.flourish.trim), drawn in the palette's roles.
export function trimSvg(kind) {
  return (TRIMS[kind] || TRIMS.none)();
}

export const TRIM_KINDS = Object.freeze(Object.keys(TRIMS));
