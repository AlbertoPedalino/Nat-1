import { OPACITY } from './colors.js';
import { STROKE_ENDS, brushStroke, drawingBox, drawingCache } from './handDrawing.js';

// The mark of colour at the head of a card's name drawn by the hand-drawing
// kit (shapes.js marker.drawing, ToneBar.jsx) in place of the style's cut
// shape: worked out here as pieces to the mark's box, its cloth or paint in
// the mark's own colour (`ink`: the kind's, an action's category or an
// item's rarity, whatever it is), its light and shade over it.
//
// The war's drape: a piece of cloth hung up by one corner, narrow where it
// is caught, falling wider in folds, a lap of its hem turned out over each
// side and hanging to a point past it. Worn: its foot torn off ragged, a
// nick torn in its far edge, a lap's point frayed, and crumpled, short
// creases broken across the long folds. Lit, not inked: its folds and
// creases are light along their ridges and dark in their hollows, its far
// side in shade.

// The colour a mark's pieces paint in: the mark's own (ToneBar sets it).
export const MARKER_INK = 'currentColor';

const DRAWINGS = Object.freeze({
  drape(w, h) {
    const at = (x, y) => [(x / 12) * w, (y / 30) * h];
    const path = (d) => d.replace(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g, (_, x, y) => at(Number(x), Number(y)).map((n) => Math.round(n * 10) / 10).join(' '));
    // A stroke on the cloth through points in its 12 by 30 box: a long fold
    // thins to nothing at both ends; a short crease (`short`) does not, or a
    // taper running its whole length would leave a hair.
    const SHORT = Object.freeze({ ...STROKE_ENDS.blunt, thinning: 0.5 });
    const fold = (points, size, fill, opacity, short = false) => ({ ...brushStroke(points.map(([x, y, pressure]) => [...at(x, y), pressure]), size, fill, short ? SHORT : STROKE_ENDS.tapered), opacity });
    // A crease crumpled across the cloth through three points: dark in its hollow, lit on its ridge.
    const crease = ([a, b, c], k = 0) => [
      fold([[...a, 0.4], [...b, 0.9], [...c, 0.4]], w * 0.06, 'black', OPACITY.line, true),
      fold([[a[0] + 0.4, a[1] + 0.5, 0.4], [b[0] + 0.4, b[1] + 0.5, 0.8], [c[0] + 0.4, c[1] + 0.5, 0.4]], w * (k % 2 ? 0.04 : 0.05), 'white', OPACITY.fill, true),
    ];
    const body = path('M7 0 C7.6 4 9.6 9 10.2 13 C10.5 15 10.6 16.4 10.5 17.4 L9.6 18.1 L10.4 18.9 C10.3 21.6 9.2 24 7.4 26.2 L6.6 27.6 L6.1 26.9 L5.3 29.8 L4.6 28.5 L3.8 29.2 L3.4 27.4 L2.7 27.9 L2.2 25.6 C2 21 2.2 16 3 12 C4 7.6 6.4 4 7 0 Z');
    // A lap of its hem turned out over each side, hanging to a point: the
    // near one lit, the far one in shade.
    const nearLap = path('M6.2 6.6 C4.4 8.4 1.8 9.8 0.2 10.6 C0.4 14 0.7 17.4 1 20.4 L1.5 21.8 L1.8 20.6 L2.4 21.2 L2.5 19.6 C3.2 17.4 4 15 5 13.2 C5.4 11 5.8 8.8 6.2 6.6 Z');
    const farLap = path('M8 8.6 C9.6 10.4 11.4 11.8 12 12.6 C12.2 16.6 11.8 20.6 11 24.2 C10.4 21 9.6 17.6 8.8 15 C8.6 12.8 8.3 10.6 8 8.6 Z');
    const lap = (d, light, foldAt, seed, creases) => [
      { tag: 'path', d, fill: 'black', blur: 0.8, opacity: OPACITY.edge, transform: 'translate(0.5 0.8)' },
      { tag: 'path', d, fill: MARKER_INK },
      { tag: 'path', d, fill: light ? 'white' : 'black', opacity: light ? OPACITY.fill : OPACITY.shade },
      { tag: 'g', clip: d, children: [fold(foldAt, w * 0.07, 'black', OPACITY.shade), ...creases.flatMap(crease)] },
      { tag: 'path', d, fill: 'none', stroke: 'black', strokeWidth: 0.4, opacity: seed ? OPACITY.line : OPACITY.edge },
    ];
    return [
      { tag: 'path', d: body, fill: 'black', blur: 1.2, opacity: OPACITY.strong, transform: 'translate(0.8 1.2)' },
      { tag: 'path', d: body, fill: MARKER_INK },
      {
        tag: 'g',
        clip: body,
        children: [
          // Its far side in shade, its near side catching the light.
          { tag: 'path', d: path('M7.4 0 H12 V30 H5.6 Z'), fill: 'black', blur: 1, opacity: OPACITY.line },
          { tag: 'path', d: path('M1 8 H4.6 V30 H1 Z'), fill: 'white', blur: 1, opacity: OPACITY.tint },
          // The folds running down from where it is caught.
          fold([[7, 1, 0.3], [5.4, 15, 0.9], [4.6, 29, 0.4]], w * 0.1, 'black', OPACITY.line),
          fold([[7.2, 2, 0.3], [8.6, 14, 0.9], [8, 25, 0.4]], w * 0.1, 'black', OPACITY.line),
          fold([[7.1, 2, 0.3], [6.9, 15, 0.9], [6.4, 27, 0.4]], w * 0.1, 'white', OPACITY.line),
          fold([[6.9, 3, 0.3], [3.8, 17, 0.8], [3, 25, 0.3]], w * 0.08, 'white', OPACITY.fill),
          // Crumpled: short creases broken across the folds.
          ...[[[6.4, 13.2], [7.4, 15], [8.8, 15.8]], [[3, 21.6], [4.4, 22.8], [5.4, 24.6]], [[5.8, 21.8], [7, 23.4], [8.4, 22.8]]].flatMap(crease),
          // Where the cloth was torn: its threads showing, a little darker.
          { tag: 'path', d: path('M2 25 H8 V30 H2 Z'), fill: 'black', blur: 0.6, opacity: OPACITY.shade },
        ],
      },
      { tag: 'path', d: body, fill: 'none', stroke: 'black', strokeWidth: 0.45, opacity: OPACITY.line },
      ...lap(farLap, false, [[8.4, 10, 0.3], [10.4, 15, 0.8], [11, 22, 0.3]], 1, [[[9, 16.4], [10.2, 18], [11.6, 18.8]]]),
      ...lap(nearLap, true, [[5.6, 8, 0.3], [2.6, 13, 0.8], [1.4, 20, 0.3]], 0, [[[1, 12.4], [2.2, 14.2], [3.8, 14.6]], [[1.2, 16.8], [2.2, 18.2], [3.4, 18.6]]]),
    ];
  },
});

export const MARKER_DRAWING_KINDS = Object.freeze(Object.keys(DRAWINGS));

// The mark `kind` draws, `width` by `height` px: its pieces and the box they
// are seen through; null where it draws none.
const marks = drawingCache((kind, width, height) => drawingBox(DRAWINGS[kind](width, height), width, height, 3));
export function markerDrawing(kind, width, height) {
  return DRAWINGS[kind] ? marks(kind, width, height) : null;
}
