import { drawingBox, drawingCache } from './handDrawing.js';
import { crackPieces, crossPieces, skullPieces, stonePieces } from './stonework.js';

// The ability scores drawn as the style draws them (shapes.js
// abilities.drawing), in place of the crest's cut: each score a thing of its
// own in a row, worked out here as pieces (the hand-drawing kit's) to its
// tile's size, drawn by MeasuredDrawing.jsx behind the tile's name and figures.
//
// The gothic's headstones (stonework.js): six stones standing in a row, each
// cut, tilted and sunk its own way, a cross or a skull over its name, a
// crack in two of them.

// The marks over a name, about (cx, cy).
const MARKS = Object.freeze({ cross: (cx, cy) => crossPieces(cx, cy, 7), skull: (cx, cy, seed) => skullPieces(cx, cy, 7, seed) });

// The six headstones, in their row: each its cut, the mark over its name,
// how far it leans (degrees) and has sunk (px), and where it has cracked.
const HEADSTONES = Object.freeze([
  { cut: 'arch', mark: 'cross', tilt: -3, sink: 0 },
  { cut: 'square', mark: 'skull', tilt: 2, sink: 5, crack: 'right' },
  { cut: 'low', mark: 'cross', tilt: -1, sink: 0 },
  { cut: 'square', mark: 'skull', tilt: 3, sink: 6 },
  { cut: 'arch', mark: 'cross', tilt: -2, sink: 2, crack: 'left' },
  { cut: 'low', mark: 'skull', tilt: 1.5, sink: 0 },
].map(Object.freeze));

const DRAWINGS = Object.freeze({
  headstones: Object.freeze({
    // The room a tile keeps over its name for the mark, px.
    head: 30,
    places: HEADSTONES,
    tile(w, h, index) {
      const { cut, mark, crack } = HEADSTONES[index % HEADSTONES.length];
      const seed = 10 + index * 7;
      return [
        ...stonePieces(w, h, cut, seed),
        ...MARKS[mark](w / 2, cut === 'square' ? 12 : 14, seed + 3),
        ...(crack === 'right' ? crackPieces([w, h * 0.34], [[-8, 5], [-3, 9], [-9, 6], [-2, 10]]) : []),
        ...(crack === 'left' ? crackPieces([0, h * 0.46], [[9, 4], [2, 9], [8, 7]]) : []),
      ];
    },
  }),
});

export const ABILITY_DRAWING_KINDS = Object.freeze(['none', ...Object.keys(DRAWINGS)]);

// Whether the drawing `kind` draws the ability scores ('none' leaves them the
// crest).
export function drawsAbilities(kind) {
  return Boolean(DRAWINGS[kind]);
}

// How the tile at `index` of its row stands as `kind` draws it: `tilt`
// degrees, `sink` px, and the `head` room it keeps over its name.
export function abilityPlace(kind, index) {
  const drawing = DRAWINGS[kind];
  const { tilt, sink } = drawing.places[index % drawing.places.length];
  return { tilt, sink, head: drawing.head };
}

// The tile at `index`, `width` by `height` px, as `kind` draws it.
const tiles = drawingCache((kind, width, height, index) => drawingBox(DRAWINGS[kind].tile(width, height, index), width, height));
export function abilityTile(kind, width, height, index) {
  return DRAWINGS[kind] ? tiles(kind, width, height, index) : null;
}
