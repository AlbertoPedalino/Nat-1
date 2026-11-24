import { OPACITY } from './colors.js';
import { STROKE_ENDS, drawingBox, drawingCache, inkStroke, sketch } from './handDrawing.js';

// An app notice drawn as the style draws it (shapes.js notice.drawing), in
// place of the style's speech bubble: one thing the notice is written on,
// worked out here as pieces (the hand-drawing kit's) to the notice's size,
// drawn by MeasuredDrawing.jsx behind what it says. Its colour and its mark are
// its severity's.
//
// The gothic's sealed strip: a strip of parchment, and hanging from its
// lower right corner a seal of wax in the notice's colour on two ribbons, the
// notice's mark pressed in it. Long and low: never taken for a roll.

// A severity's wax (a palette role) and the mark pressed in it, about
// (cx, cy): whole strokes, square at both ends and one weight along their
// length, so no part of a mark thins away.
const pressed = (points, size = 4.6) => inkStroke(points.map(([x, y]) => [x, y, 0.8]), size, STROKE_ENDS.blunt);
const dot = (cx, cy) => pressed([[cx, cy], [cx + 0.4, cy + 0.4]], 5);
const SEVERITIES = Object.freeze({
  success: { wax: 'success', mark: (cx, cy) => [pressed([[cx - 8, cy + 1], [cx - 2.5, cy + 6.5], [cx + 8, cy - 7]])] },
  error: { wax: 'danger', mark: (cx, cy) => [pressed([[cx - 7, cy - 7], [cx + 7, cy + 7]]), pressed([[cx + 7, cy - 7], [cx - 7, cy + 7]])] },
  warning: { wax: 'warning', mark: (cx, cy) => [pressed([[cx, cy - 10], [cx, cy + 2]]), dot(cx, cy + 8.5)] },
  info: { wax: 'info', mark: (cx, cy) => [dot(cx, cy - 8.5), pressed([[cx, cy - 2], [cx, cy + 10]])] },
});

// How far the seal hangs under the strip, px: the room a notice keeps there.
const SEAL = 20;
const HANG = SEAL + 14;

const DRAWINGS = Object.freeze({
  sealed: Object.freeze({
    hang: HANG,
    frame(w, h, severity) {
      const { wax, mark } = SEVERITIES[severity] || SEVERITIES.info;
      const [cx, cy] = [w - 36, h - 1];
      const strip = `M0 0 H${w} V${h} H0 Z`;
      return [
        { tag: 'path', d: strip, fill: 'edge', transform: 'translate(4 4)' },
        ...sketch('path', strip, { seed: 61, roughness: 1, bowing: 0.8, stroke: 'edge', strokeWidth: 2.4, fill: 'paper', fillStyle: 'solid' }),
        ...sketch('path', strip, { seed: 62, roughness: 0.7, fill: 'onPaper', fillStyle: 'hachure', hachureAngle: -38, hachureGap: 9, fillWeight: 0.8, opacity: OPACITY.soft }),
        // The two ribbons the seal hangs on, their ends cut in a swallowtail.
        ...sketch('polygon', [[cx - 13, h - 5], [cx - 17, h + HANG - 2], [cx - 10, h + HANG - 8], [cx - 3, h + HANG - 1], [cx - 1, h - 5]], { seed: 63, roughness: 0.8, stroke: 'edge', strokeWidth: 1.4, fill: 'accentMuted', fillStyle: 'solid' }),
        ...sketch('polygon', [[cx + 1, h - 5], [cx + 4, h + HANG], [cx + 10, h + HANG - 7], [cx + 17, h + HANG - 3], [cx + 13, h - 5]], { seed: 64, roughness: 0.8, stroke: 'edge', strokeWidth: 1.4, fill: 'accentMuted', fillStyle: 'solid' }),
        // The seal: wax pressed unevenly, a ring in it, the mark in the ring.
        { tag: 'circle', cx: cx + 2, cy: cy + 3, r: SEAL, fill: 'edge' },
        ...sketch('circle', cx, cy, SEAL * 2, { seed: 65, roughness: 1.6, bowing: 1.2, stroke: 'edge', strokeWidth: 2, fill: wax, fillStyle: 'solid' }),
        { tag: 'g', opacity: OPACITY.strong, children: sketch('circle', cx, cy, SEAL * 1.4, { seed: 66, roughness: 0.9, stroke: 'edge', strokeWidth: 1.2 }) },
        ...mark(cx, cy),
      ];
    },
  }),
});

export const NOTICE_DRAWING_KINDS = Object.freeze(['none', ...Object.keys(DRAWINGS)]);
export const NOTICE_SEVERITIES = Object.freeze(Object.keys(SEVERITIES));

// Whether the drawing `kind` draws an app notice ('none' leaves it the
// style's bubble).
export function drawsNotice(kind) {
  return Boolean(DRAWINGS[kind]);
}

// The room, px, a notice drawn as `kind` keeps under itself for what hangs
// from it.
export function noticeHang(kind) {
  return DRAWINGS[kind].hang;
}

// The notice `width` by `height` px as `kind` draws it, of `severity`.
const frames = drawingCache((kind, width, height, severity) => drawingBox(DRAWINGS[kind].frame(width, height, severity), width, height, HANG + 4));
export function noticeFrame(kind, width, height, severity) {
  return DRAWINGS[kind] ? frames(kind, width, height, severity) : null;
}
