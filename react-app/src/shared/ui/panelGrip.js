import { clamp } from '../numbers.js';
import { OPACITY } from './colors.js';
import { brushBounds, brushPath, drawingCache, sketch, unit } from './handDrawing.js';

// What grips a panel, as the style draws it (shapes.js panel.grip): a drawing
// laid over the panel's top edge and down its side, cut to the panel's own
// size, drawn by PanelGrip.jsx. Each is worked out here as pieces
// (handDrawing.js: paths in the panel's px, coloured by the palette's role
// names), so it can be drawn, cached and tested without a page.
//
// The abyssal's tentacle: in from the panel's left edge, swaying along its top,
// round the right corner and down the side, its tip curled away from the
// panel. Its body a brush stroke tapering from base to tip (perfect-freehand),
// its underside hatched in shade, its ink and suckers drawn by hand (Rough.js).

// The room a gripped panel's bar keeps over its title for the drawing, px.
export const GRIP_ROOM = 14;

const SIZE = 12;
const THINNING = 0.9;
const TAPER = 1.15;
const STEP = 2.5;
const CORNER = 26;
const SWAY = 4;
const SEED = 7;

const radius = (pressure) => SIZE * (0.5 - THINNING * (0.5 - pressure));

// A centreline from moves, each carrying on from where, and the way, the last
// ended: a `sway` towards a point, swinging `amp` px either side `periods`
// times; a `curl` `r` px across, `turns` round, to the left (-1) or the right
// (+1) of the way it goes, tightening by `shrink`.
function centreline(start, way, moves) {
  const points = [start];
  let heading = unit(way);
  for (const move of moves) {
    const [px, py] = points[points.length - 1];
    if (move.sway) {
      const [tx, ty] = move.sway;
      const along = unit([tx - px, ty - py]);
      for (let i = 1; i <= 80; i += 1) {
        const u = i / 80;
        const swing = Math.sin(u * Math.PI * 2 * move.periods) * move.amp * Math.sin(u * Math.PI) ** 0.5;
        points.push([px + (tx - px) * u - along[1] * swing, py + (ty - py) * u + along[0] * swing]);
      }
    } else {
      const { r, turns, side, shrink } = move.curl;
      const centre = [px - side * heading[1] * r, py + side * heading[0] * r];
      const from = Math.atan2(py - centre[1], px - centre[0]);
      const turning = Math.sign(-Math.sin(from) * heading[0] + Math.cos(from) * heading[1]) || 1;
      const count = Math.max(4, Math.round(70 * turns));
      for (let i = 1; i <= count; i += 1) {
        const u = i / count;
        const angle = from + turning * u * turns * Math.PI * 2;
        const reach = r * (1 - u * shrink);
        points.push([centre[0] + reach * Math.cos(angle), centre[1] + reach * Math.sin(angle)]);
      }
    }
    const [ax, ay] = points[points.length - 2];
    const [bx, by] = points[points.length - 1];
    heading = unit([bx - ax, by - ay]);
  }
  return points;
}

// The line at even steps along it, its pressure falling from base to tip.
function resample(points) {
  const along = [0];
  for (let i = 1; i < points.length; i += 1) {
    along.push(along[i - 1] + Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]));
  }
  const total = along[along.length - 1];
  const count = Math.max(2, Math.round(total / STEP));
  const out = [];
  let j = 0;
  for (let i = 0; i <= count; i += 1) {
    const at = (i / count) * total;
    while (j < along.length - 2 && along[j + 1] < at) j += 1;
    const share = (at - along[j]) / ((along[j + 1] - along[j]) || 1);
    out.push([
      points[j][0] + (points[j + 1][0] - points[j][0]) * share,
      points[j][1] + (points[j + 1][1] - points[j][1]) * share,
      0.04 + 0.96 * (1 - i / count) ** TAPER,
    ]);
  }
  return out;
}

function tentacle(width, height) {
  const drop = clamp(height - 34, 36, 104);
  const line = resample(centreline([6, 0], [1, 0], [
    { sway: [width - CORNER, 0], amp: SWAY, periods: Math.max(0.5, Math.round((width / 240) * 2) / 2) },
    { curl: { r: CORNER, turns: 0.25, side: 1, shrink: 0 } },
    { sway: [width + 4, drop], amp: SWAY, periods: 1 },
    { curl: { r: 9, turns: 1.5, side: -1, shrink: 0.85 } },
  ]));
  // Each point's normal, to the underside (below the top run, outside the side).
  const normals = line.map((_, i) => {
    const [ax, ay] = line[Math.max(0, i - 1)];
    const [bx, by] = line[Math.min(line.length - 1, i + 1)];
    const [x, y] = unit([bx - ax, by - ay]);
    return [-y, x];
  });
  const shifted = (share) => line.map(([x, y, p], i) => [x + normals[i][0] * radius(p) * share, y + normals[i][1] * radius(p) * share, p]);
  const options = { thinning: THINNING };
  const body = brushPath(line, SIZE, options);
  const suckers = line.flatMap(([x, y, p], i) => {
    if (i % 4 !== 2 || p < 0.14) return [];
    const r = radius(p);
    const across = Math.max(1.8, r * 0.62);
    return sketch('ellipse', x + normals[i][0] * r * 0.7, y + normals[i][1] * r * 0.7, across * 1.25, across, {
      seed: SEED + i, roughness: 0.4, stroke: 'dangerMuted', strokeWidth: 1, fill: 'paper', fillStyle: 'solid',
    });
  });
  const reach = brushBounds(line, SIZE, options);
  const margin = 4;
  const left = Math.floor(reach.left) - margin;
  const top = Math.floor(reach.top) - margin;
  return {
    box: { left, top, width: Math.ceil(reach.right) + margin - left, height: Math.ceil(reach.bottom) + margin - top },
    pieces: [
      { tag: 'path', d: body, fill: 'accent' },
      // Inside the body: its underside hatched in shade, a lit ridge along
      // its back.
      {
        tag: 'g',
        clip: body,
        children: [
          ...sketch('path', brushPath(shifted(0.75), SIZE * 0.9, options), {
            seed: SEED, roughness: 0, fill: 'accentMuted', fillStyle: 'hachure', hachureAngle: 50, hachureGap: 2.6, fillWeight: 1,
          }),
          { tag: 'path', d: brushPath(shifted(-0.6), SIZE * 0.24, options), fill: 'accentHighlight', opacity: OPACITY.heavy },
        ],
      },
      // Over it: its ink, then its suckers.
      ...sketch('path', body, { seed: SEED, roughness: 0.5, bowing: 0.4, stroke: 'edge', strokeWidth: 1.8 }),
      ...suckers,
    ],
  };
}

const GRIPS = Object.freeze({ tentacle });

export const GRIP_KINDS = Object.freeze(['none', ...Object.keys(GRIPS)]);

// The drawing of a grip `kind` round a panel `width` by `height` px: its `box`
// (where it reaches, from the panel's top left corner, the bar's) and its
// `pieces`. Null for 'none'.
const drawn = drawingCache((kind, width, height) => GRIPS[kind](width, height));
export function panelGrip(kind, width, height) {
  return GRIPS[kind] ? drawn(kind, width, height) : null;
}
