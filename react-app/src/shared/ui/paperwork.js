import { OPACITY } from './colors.js';
import { seededRandom } from '../seededRandom.js';
import { STROKE_ENDS, brushStroke, sagPoints, sketch, softShadow } from './handDrawing.js';

// Paper, and what a detective does with it, as the hand-drawing kit draws it
// (handDrawing.js): what the noir's case is made of, wherever a piece of it
// lies (a panel's banner, panelBanner.js; the ability scores,
// abilityDrawing.js; a roll's toast, toastDrawing.js; an app notice,
// noticeDrawing.js): a folder's sheets, cards on a thread, a newspaper.
// Pieces coloured by the palette's role names. Lit, not inked: a sheet is
// shaded top to foot and lifted by a soft shadow, its edge a thin sketched
// line.

const SHEET = Object.freeze({ shade: [[0, 'paper'], [1, 'paperShade']] });

// A sheet of paper cut to the path `d`: its soft shadow, the sheet, its edge.
export function paperPieces(d, seed, roughness = 0.7) {
  return [
    softShadow(d),
    { tag: 'path', d, fill: SHEET },
    ...sketch('path', d, { seed, roughness, bowing: 0.4, stroke: 'onPaper', strokeWidth: 1, opacity: OPACITY.strong }),
  ];
}

// A leaf under another (a page under the front one, a fold's back): in the
// paper's shade, its edge alone, no shadow of its own.
function leafPieces(d, seed) {
  return [
    { tag: 'path', d, fill: 'paperShade' },
    ...sketch('path', d, { seed, roughness: 0.5, bowing: 0.4, stroke: 'onPaper', strokeWidth: 0.8, opacity: OPACITY.strong }),
  ];
}

// A folded newspaper, w by h, as the papers on a stand are drawn: its front
// page, its top and its foot a little waved, its lower left corner round; and
// behind it the rest of the paper, three pages each a little higher and
// further left than the one before, their tops showing over the front page's
// and their corners stepping back at the right. Down the left side each
// turns round the fold, close against the one before: a light curve out and
// back in to the front page's lower corner, where they all meet; of each
// only its edge shows, a thin band of paper, and inside it a thread of the
// fold's dark. Its shadow under it. `frontPage` is the front page's own
// outline, for what is drawn on it; `foldedPaperPieces` what lies behind it.
export const frontPage = (w, h) => `M0 5 Q${w * 0.5} -4 ${w} 3 V${h - 3} Q${w * 0.5} ${h + 4} 16 ${h} Q0 ${h} 0 ${h - 16} Z`;
// How thick a turning page shows, px.
const PAGE_EDGE = 2.5;
export function foldedPaperPieces(w, h, seed) {
  // Smaller on a smaller paper (the one over a piece on the map).
  const scale = Math.min(1, Math.max(0.6, w / 290));
  // The page `k` behind: how far up and left its top corner stands, how far its fold swells.
  const stand = (k) => [4 * k * scale, 4 * k * scale, (3 + 5 * k) * scale];
  // A fold's side, from the corner where the pages meet up to `top`, swelling `out` px.
  const side = (out, left, top) => `C${-out} ${h * 0.84} ${-out * 1.15} ${h * 0.34} ${-left} ${top}`;
  const page = (k) => {
    const [left, up, out] = stand(k);
    return `M${8 - left} ${5 - up} Q${w * 0.5 - left} ${-4 - up} ${w - 8 * k * scale} ${3 - up} V16 H14 V${h - 1} H13 ${side(out, left, 20 - up)} Q${-left} ${5 - up} ${8 - left} ${5 - up} Z`;
  };
  const hollow = (k) => {
    const [left, up, out] = stand(k);
    return `M13 ${h - 3} ${side(out - PAGE_EDGE, left - PAGE_EDGE - 1, 32 - up)} L14 ${32 - up} V${h - 3} Z`;
  };
  return [
    { tag: 'ellipse', cx: w / 2 - 10, cy: h + 12, rx: w * 0.52, ry: 7, fill: 'black', blur: 7, opacity: OPACITY.heavy },
    ...[3, 2, 1].flatMap((k) => [...leafPieces(page(k), seed + k), { tag: 'path', d: hollow(k), fill: 'black', opacity: OPACITY.veil }]),
  ];
}

// A pushpin's head at (cx, cy) in `fill`: its shadow on the paper, the head,
// the light on it.
export function pinPieces(cx, cy, fill, seed) {
  return [
    { tag: 'ellipse', cx: cx + 2, cy: cy + 3, rx: 5, ry: 3, fill: 'black', blur: 2, opacity: OPACITY.strong },
    ...sketch('circle', cx, cy, 10, { seed, roughness: 0.5, stroke: 'black', strokeWidth: 0.8, fill, fillStyle: 'solid' }),
    { tag: 'circle', cx: cx - 1.6, cy: cy - 1.8, r: 1.7, fill: 'white', opacity: OPACITY.strong },
  ];
}

// The red thread from pin to pin (`pins`: [x, y] each), sagging `drop` px
// between two of them: its shadow, then the thread.
export function threadPieces(pins, drop = 7) {
  const run = pins.slice(1).flatMap((to, i) => sagPoints(pins[i], to, drop));
  return [
    { ...brushStroke(run.map(([x, y]) => [x, y + 1.6, 0.8]), 2.4, 'black', STROKE_ENDS.blunt), opacity: OPACITY.edge },
    brushStroke(run.map(([x, y]) => [x, y, 0.8]), 1.7, 'danger', STROKE_ENDS.blunt),
  ];
}

// A bullet hole `r` px round at (cx, cy): cracks struck out from it (as
// `seed` throws them, `reach` px at most), the crushed ring, the dark of the
// hole. `rim` is what the cracks are drawn in: ink on paper, light on glass.
export function bulletHolePieces(cx, cy, r, { rim = 'onPaper', cracks = 6, reach = 16, seed = 1 } = {}) {
  const random = seededRandom(`bullet-hole-${seed}`);
  const struck = Array.from({ length: cracks }, (_, i) => {
    const angle = (i / cracks) * Math.PI * 2 + random() * 0.7;
    const far = reach * (0.45 + random());
    const at = (length, turn = 0) => [cx + Math.cos(angle + turn) * length, cy + Math.sin(angle + turn) * length];
    return brushStroke([[...at(r), 0.9], [...at(far * 0.55, 0.18), 0.6], [...at(far + r), 0.1]], 1.7, rim, STROKE_ENDS.pointed);
  });
  return [
    ...struck,
    ...sketch('circle', cx, cy, r * 2.9, { seed, roughness: 1.1, stroke: rim, strokeWidth: 0.9 }),
    ...sketch('circle', cx, cy, r * 2, { seed: seed + 1, roughness: 0.7, fill: 'black', fillStyle: 'solid' }),
  ];
}

// A column of print `width` by `height` px from (x, y): its lines of type,
// drawn as close strokes, too small to read.
export function printPieces(x, y, width, height, seed) {
  return sketch('rectangle', x, y, width, height, { seed, roughness: 0.6, fill: 'onPaper', fillStyle: 'hachure', hachureAngle: 90, hachureGap: 4.5, fillWeight: 1.1, opacity: OPACITY.line });
}

// A rule across a page from (x, y), `length` px long and `size` px thick.
export const rulePieces = (x, y, length, size) => [brushStroke([[x, y, 0.8], [x + length, y, 0.8]], size, 'onPaper', STROKE_ENDS.blunt)];

// What is stamped or written in a coloured ink on paper, deepened: the same
// pieces again in the paper's own ink, faint, so a pale colour still reads.
export function deepened(pieces) {
  const inked = ({ fill, stroke, ...piece }) => ({
    ...piece, fill: fill && fill !== 'none' ? 'onPaper' : fill, stroke: stroke && stroke !== 'none' ? 'onPaper' : stroke, opacity: OPACITY.edge,
  });
  return [...pieces, ...pieces.map(inked)];
}
