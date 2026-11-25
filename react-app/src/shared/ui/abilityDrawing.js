import { OPACITY } from './colors.js';
import { STROKE_ENDS, boxPath, brushStroke, drawingBox, drawingCache, sketch } from './handDrawing.js';
import { crackPieces, crossPieces, earthPieces, skullPieces, stonePieces } from './stonework.js';
import { paperPieces, pinPieces, threadPieces } from './paperwork.js';

// The ability scores drawn as the style draws them (shapes.js
// abilities.drawing), in place of the crest's cut: each score a thing of its
// own in a row, worked out here as pieces (the hand-drawing kit's) to its
// tile's size, drawn by MeasuredDrawing.jsx behind the tile's name and figures.
//
// The gothic's headstones (stonework.js): six stones standing in a row, each
// cut, tilted and sunk its own way, a cross or a skull over its name, a
// crack in two of them, and before each row of them the earth they are set
// in. The noir's cards (paperwork.js): six index cards
// pinned up askew, the name typed over a double rule, the score ringed in red
// ink, and the red thread run from pin to pin across the row.

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

// The six cards, in their row: how far each hangs askew (degrees) and low
// (px).
const CARDS = Object.freeze([
  { tilt: -2, sink: 0 }, { tilt: 1.6, sink: 4 }, { tilt: -1.2, sink: 1 }, { tilt: 2, sink: 3 }, { tilt: -1.8, sink: 0 }, { tilt: 1.2, sink: 2 },
].map(Object.freeze));
// Where a card's pin is under its top, and its name's line under the pin's
// room, px.
const PIN = 7;
const NAME_LINE = 21;

// A drawing's place at `index` of its row: its `places` over again past the
// sixth.
const placeAt = (places, index) => places[index % places.length];

// The earth before a row of headstones, px: how far it rises up each stone's
// foot, how thick it is, and how far it runs past the row's two ends.
const EARTH = Object.freeze({ rise: 9, thick: 14, past: 11 });

// The rows a drawing's tiles ([left, top, width, height] each) stand in, top
// to foot (one where the sheet has the width, two of three on a phone): each
// tile with its place in the drawing after it.
function rowsOf(tiles) {
  const rows = new Map();
  tiles.forEach((tile, place) => {
    const foot = tile[1] + tile[3];
    rows.set(foot, [...(rows.get(foot) || []), [...tile, place]]);
  });
  return [...rows].sort(([a], [b]) => a - b).map(([, row]) => row);
}

// Each drawing: the room a tile keeps over its name (`head`, px), under it
// (`under`: for what is ruled there) and under its figures (`foot`: for what
// it is set in), how its six tiles stand (`places`), its `look` (whether it is the style's paper,
// written in the bubble's ink; the role its score is figured in; whether the
// score is ringed), a tile's pieces, and what it draws more: the ring round
// a score, the `strand` laid over all its tiles ([left, top, width, height]
// each, in the row's box).
const DRAWINGS = Object.freeze({
  headstones: Object.freeze({
    head: 30,
    under: 0,
    foot: 18,
    places: HEADSTONES,
    look: Object.freeze({ paper: false, score: 'secondaryText', ring: false }),
    tile(w, h, index) {
      const { cut, mark, crack } = placeAt(HEADSTONES, index);
      const seed = 10 + index * 7;
      return [
        ...stonePieces(w, h, cut, seed),
        ...MARKS[mark](w / 2, cut === 'square' ? 12 : 14, seed + 3),
        ...(crack === 'right' ? crackPieces([w, h * 0.34], [[-8, 5], [-3, 9], [-9, 6], [-2, 10]]) : []),
        ...(crack === 'left' ? crackPieces([0, h * 0.46], [[9, 4], [2, 9], [8, 7]]) : []),
      ];
    },
    // The earth before each row of stones: level across each stone, as far up
    // its foot as up any other's however deep it has sunk, sloping from one
    // stone to the next.
    strand: (tiles) => rowsOf(tiles).flatMap((row, index) => {
      const sills = row.flatMap(([left, top, w, h, place]) => {
        const y = top + h + placeAt(HEADSTONES, place).sink - EARTH.rise;
        return [[left, y], [left + w, y]];
      });
      return earthPieces(sills, EARTH.thick, EARTH.past, 70 + index * 11);
    }),
  }),
  cards: Object.freeze({
    head: 18,
    under: 9,
    foot: 12,
    places: CARDS,
    look: Object.freeze({ paper: true, score: 'dangerDeep', ring: true }),
    tile(w, h, index) {
      const rule = this.head + NAME_LINE;
      const ruled = (y, size, lift = 0) => brushStroke([[7, y, 0.8], [w - 7, y + lift, 0.8]], size, 'onPaper', STROKE_ENDS.blunt);
      return [
        ...paperPieces(boxPath(w, h), 20 + index * 7, 0.8),
        ruled(rule, 1.1, index % 2 ? 0.8 : -0.6),
        { ...ruled(rule + 3, 0.6), opacity: OPACITY.heavy },
      ];
    },
    ring: (w, h, index) => sketch('ellipse', w / 2, h / 2, w + 2, h + 1, { seed: 30 + index * 3, roughness: 1.3, stroke: 'dangerDeep', strokeWidth: 1.6 }),
    // The thread from pin to pin, and the pins it is wound on: each where its
    // card's lean and drop have carried it.
    strand(tiles) {
      const pins = tiles.map(([left, top, w, h], i) => {
        const { tilt, sink } = placeAt(CARDS, i);
        return [left + w / 2 + Math.sin((tilt * Math.PI) / 180) * (h - PIN), top + sink + PIN];
      });
      return [...threadPieces(pins, 9), ...pins.flatMap(([x, y], i) => pinPieces(x, y, i % 3 === 1 ? 'accent' : 'danger', 50 + i * 3))];
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
// degrees, `sink` px, and the room it keeps over its name (`head`), under it
// (`under`) and under its figures (`foot`).
export function abilityPlace(kind, index) {
  const drawing = DRAWINGS[kind];
  const { tilt, sink } = placeAt(drawing.places, index);
  return { tilt, sink, head: drawing.head, under: drawing.under, foot: drawing.foot };
}

// How scores drawn as `kind` are written: whether on the style's paper
// (`paper`: in its bubble's ink), the role a score is figured in (`score`),
// whether the score is ringed (`ring`).
export function abilityLook(kind) {
  return DRAWINGS[kind].look;
}

// The ring round the score at `index`, `width` by `height` px (the score's
// own figure), as `kind` draws it; null where it draws none.
const rings = drawingCache((kind, width, height, index) => drawingBox(DRAWINGS[kind].ring(width, height, index), width, height));
export function abilityRing(kind, width, height, index) {
  return DRAWINGS[kind]?.ring ? rings(kind, width, height, index) : null;
}

// What `kind` draws over the whole row, `width` by `height` px, its `tiles`
// each [left, top, width, height] in it: the noir's thread from the pin of
// one card to the next, the earth before each row of the gothic's headstones.
// Null where it draws none.
const strands = drawingCache((kind, width, height, tiles) => drawingBox(DRAWINGS[kind].strand(tiles), width, height, 12));
export function abilityStrand(kind, width, height, tiles) {
  return DRAWINGS[kind]?.strand && tiles.length ? strands(kind, width, height, tiles) : null;
}

// The tile at `index`, `width` by `height` px, as `kind` draws it.
const tiles = drawingCache((kind, width, height, index) => drawingBox(DRAWINGS[kind].tile(width, height, index), width, height));
export function abilityTile(kind, width, height, index) {
  return DRAWINGS[kind] ? tiles(kind, width, height, index) : null;
}
