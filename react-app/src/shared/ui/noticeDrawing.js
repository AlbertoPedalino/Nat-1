import { OPACITY } from './colors.js';
import { seededRandom } from '../seededRandom.js';
import { STROKE_ENDS, boxPath, brushStroke, drawingBox, drawingCache, polygonPath, sketch, solidShadow } from './handDrawing.js';
import { deepened, paperPieces, printPieces, rulePieces } from './paperwork.js';
import { barbedWirePieces, boltPieces, steelPieces } from './ironwork.js';

// An app notice drawn as the style draws it (shapes.js notice.drawing), in
// place of the style's speech bubble: one thing the notice is written on,
// worked out here as pieces (the hand-drawing kit's) to the notice's size,
// drawn by MeasuredDrawing.jsx behind what it says. Its colour and its mark are
// its severity's. Long and low, each of them: never taken for a roll.
//
// The gothic's sealed strip: a strip of parchment, and hanging from its
// lower right corner a seal of wax in the notice's colour on two ribbons, the
// notice's mark pressed in it. The noir's clipping: a story cut out of a
// newspaper with scissors, under its rules, the next column's print at its
// end and over it a round stamp in the notice's colour. The war's tin strip: a strip of rusted steel
// nailed up, a disc of paint in the notice's colour chipped off it, a curl of
// barbed wire hanging from its end.

// A severity's colour (a palette role) and its mark about (cx, cy) in `fill`:
// whole strokes, square at both ends and one weight along their length, so
// no part of a mark thins away.
const pressed = (fill, points, size = 4.6) => brushStroke(points.map(([x, y]) => [x, y, 0.8]), size, fill, STROKE_ENDS.blunt);
const dot = (fill, cx, cy) => pressed(fill, [[cx, cy], [cx + 0.4, cy + 0.4]], 5);
const SEVERITIES = Object.freeze({
  success: { role: 'success', mark: (cx, cy, fill) => [pressed(fill, [[cx - 8, cy + 1], [cx - 2.5, cy + 6.5], [cx + 8, cy - 7]])] },
  error: { role: 'danger', mark: (cx, cy, fill) => [pressed(fill, [[cx - 7, cy - 7], [cx + 7, cy + 7]]), pressed(fill, [[cx + 7, cy - 7], [cx - 7, cy + 7]])] },
  warning: { role: 'warning', mark: (cx, cy, fill) => [pressed(fill, [[cx, cy - 10], [cx, cy + 2]]), dot(fill, cx, cy + 8.5)] },
  info: { role: 'info', mark: (cx, cy, fill) => [dot(fill, cx, cy - 8.5), pressed(fill, [[cx, cy - 2], [cx, cy + 10]])] },
});

// The gothic's seal: how far it hangs under the strip, px.
const SEAL = 20;
const HANG = SEAL + 14;
// The noir's stamp and the war's disc: how wide, px, and how far in from
// the strip's end their middle is.
const STAMP = Object.freeze({ r: 21, in: 66 });
const DISC = Object.freeze({ r: 21, in: 36 });

// Each drawing: the `ink` its words are written in (a role), the room it
// keeps clear for what it carries (`left` and `right` of the words, `under`
// the notice, px), and its pieces for a notice w by h of a severity.
const DRAWINGS = Object.freeze({
  sealed: Object.freeze({
    look: Object.freeze({ ink: 'onPaper', left: 0, right: 0, under: HANG }),
    frame(w, h, { role, mark }) {
      const [cx, cy] = [w - 36, h - 1];
      const strip = boxPath(w, h);
      return [
        solidShadow(strip),
        ...sketch('path', strip, { seed: 61, roughness: 1, bowing: 0.8, stroke: 'edge', strokeWidth: 2.4, fill: 'paper', fillStyle: 'solid' }),
        ...sketch('path', strip, { seed: 62, roughness: 0.7, fill: 'onPaper', fillStyle: 'hachure', hachureAngle: -38, hachureGap: 9, fillWeight: 0.8, opacity: OPACITY.soft }),
        // The two ribbons the seal hangs on, their ends cut in a swallowtail.
        ...sketch('polygon', [[cx - 13, h - 5], [cx - 17, h + HANG - 2], [cx - 10, h + HANG - 8], [cx - 3, h + HANG - 1], [cx - 1, h - 5]], { seed: 63, roughness: 0.8, stroke: 'edge', strokeWidth: 1.4, fill: 'accentMuted', fillStyle: 'solid' }),
        ...sketch('polygon', [[cx + 1, h - 5], [cx + 4, h + HANG], [cx + 10, h + HANG - 7], [cx + 17, h + HANG - 3], [cx + 13, h - 5]], { seed: 64, roughness: 0.8, stroke: 'edge', strokeWidth: 1.4, fill: 'accentMuted', fillStyle: 'solid' }),
        // The seal: wax pressed unevenly, a ring in it, the mark in the ring.
        { tag: 'circle', cx: cx + 2, cy: cy + 3, r: SEAL, fill: 'edge' },
        ...sketch('circle', cx, cy, SEAL * 2, { seed: 65, roughness: 1.6, bowing: 1.2, stroke: 'edge', strokeWidth: 2, fill: role, fillStyle: 'solid' }),
        { tag: 'g', opacity: OPACITY.strong, children: sketch('circle', cx, cy, SEAL * 1.4, { seed: 66, roughness: 0.9, stroke: 'edge', strokeWidth: 1.2 }) },
        ...mark(cx, cy, 'edge'),
      ];
    },
  }),
  clipping: Object.freeze({
    look: Object.freeze({ ink: 'onPaper', left: 0, right: STAMP.in + STAMP.r - 20, under: 0 }),
    frame(w, h, { role, mark }) {
      // Cut out with scissors, never quite square.
      const cut = polygonPath([[0, 2], [w * 0.4, 0], [w - 1, 1.5], [w, h - 2], [w * 0.55, h], [1.5, h - 1]]);
      const [cx, cy] = [w - STAMP.in, h / 2];
      const column = cx - STAMP.r - 12;
      return [
        ...paperPieces(cut, 71, 0.6),
        // The page it was cut from: the rules over its story, the column next to it.
        ...rulePieces(10, 7, column - 18, 1.6),
        ...rulePieces(10, 10.5, column - 18, 0.6),
        { tag: 'rect', x: column, y: 6, width: 0.7, height: h - 12, fill: 'onPaper', opacity: OPACITY.line },
        { tag: 'g', clip: cut, children: printPieces(column + 6, 6, w - column, h - 12, 74) },
        // The stamp: two rings pressed unevenly, the mark in them.
        ...deepened([
          ...sketch('circle', cx, cy, STAMP.r * 2, { seed: 72, roughness: 1.4, bowing: 1.2, stroke: role, strokeWidth: 2.2 }),
          ...sketch('circle', cx, cy, STAMP.r * 1.6, { seed: 73, roughness: 1.1, stroke: role, strokeWidth: 0.9 }),
          ...mark(cx, cy, role),
        ]),
      ];
    },
  }),
  tin: Object.freeze({
    look: Object.freeze({ ink: 'textPrimary', left: DISC.in + DISC.r - 12, right: 8, under: 22 }),
    frame(w, h, { role, mark }) {
      const strip = polygonPath([[5, 0], [w - 5, 0], [w, 5], [w, h - 5], [w - 5, h], [5, h], [0, h - 5], [0, 5]]);
      const [cx, cy] = [DISC.in, h / 2];
      const random = seededRandom('notice-tin-chips');
      // Where the paint has chipped off the disc, the steel shows.
      const chips = Array.from({ length: 7 }, () => {
        const [angle, far] = [random() * Math.PI * 2, DISC.r * (0.6 + random() * 0.4)];
        const [x, y] = [cx + Math.cos(angle) * far, cy + Math.sin(angle) * far];
        return brushStroke([[x, y, 0.3], [x + 3, y + 2, 0.9], [x + 5, y - 2, 0.2]], 3.4, 'surfaceHeader');
      });
      return [
        { tag: 'path', d: strip, fill: 'black', blur: 4, opacity: OPACITY.heavy, transform: 'translate(0 4)' },
        ...steelPieces(strip, w, 0, h, 'notice-tin', 4),
        ...boltPieces(w - 9, 9),
        ...boltPieces(w - 9, h - 9),
        ...sketch('circle', cx, cy, DISC.r * 2, { seed: 81, roughness: 1.2, bowing: 1, fill: role, fillStyle: 'solid' }),
        ...chips,
        ...mark(cx, cy, 'black').map((piece) => ({ ...piece, opacity: OPACITY.veil })),
        ...barbedWirePieces([[w - 26, h - 4], [w - 20, h + 8], [w - 30, h + 20]], { every: 12 }),
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

// How a notice drawn as `kind` is laid on its drawing: the `ink` (a role) its
// words are written in, and the room, px, it keeps for what the drawing
// carries: `left` and `right` of its words, `under` itself.
export function noticeLook(kind) {
  return DRAWINGS[kind].look;
}

// The notice `width` by `height` px as `kind` draws it, of `severity`.
const frames = drawingCache((kind, width, height, severity) => {
  const { frame, look } = DRAWINGS[kind];
  return drawingBox(frame(width, height, SEVERITIES[severity] || SEVERITIES.info), width, height, look.under + 8);
});
export function noticeFrame(kind, width, height, severity) {
  return DRAWINGS[kind] ? frames(kind, width, height, severity) : null;
}
