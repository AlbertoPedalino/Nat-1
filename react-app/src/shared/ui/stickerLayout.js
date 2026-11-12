import { UI_COLORS } from './colors.js';
import { STICKER_DRAWINGS } from './gameIcons.js';
import { seededRandom } from '../seededRandom.js';

// The layout and drawing of the app's sticker paper (stickerPaper.js): the
// game's things in diagonal files on one square tile, repeated by the
// browser. Pure, so scripts/build-sticker-paper.mjs can draw it in Node and
// photograph it into the PNGs the app ships.
//
// The step between stickers along a row; neighbours on a diagonal stand
// STEP/√2 apart. The tile holds a whole number of steps and an even number of
// rows, so the files run on across the repeat.
const STEP = 51;
// A wide tile, so its repeat is not seen as a pattern of its own.
export const TILE = STEP * 16;
const ROWS = (TILE / STEP) * 2;
// Every sticker the same size; each turned its own way, up to TILT degrees.
const SIZE = 45;
const TILT = 15;
// The ink round a sticker and the offset of its shadow, in pixels.
const INK = 1.3;
const SHADOW = 1.5;
// No drawing stands near itself: within this distance every sticker is a
// different drawing. The d20 comes far more often than any other drawing, so
// it only keeps off its direct neighbours.
const KEEP_APART = STEP * 2.05;
const D20_KEEP_APART = STEP * 1.05;
// How often a sticker is the d20.
const D20_SHARE = 0.15;

// The d20, the app's own die, drawn plain for the paper: the icon sets' d20s
// are too detailed to read at sticker size. A hexagon, its middle face and
// the edges round it; the edges take the ink, not the fill.
const D20 = Object.freeze({
  box: [0, 0, 100, 100],
  paths: [
    { d: 'M50 4L90 27V73L50 96L10 73V27Z', fill: true },
    { d: 'M50 30L73 67H27Z M50 30L10 27 M50 30L90 27 M50 30V4 M27 67L10 27 M27 67L10 73 M27 67L50 96 M73 67L90 27 M73 67L90 73 M73 67L50 96', fill: false },
  ],
});

// A game icon's paths, read off the icon component's own element tree (an
// icon is a plain function returning its <svg> and the paths in it).
function pathsOf(node, out = []) {
  if (Array.isArray(node)) node.forEach((child) => pathsOf(child, out));
  else if (node && typeof node === 'object') {
    if (node.props?.d) out.push({ d: node.props.d, fill: node.props.fill !== 'none' });
    pathsOf(node.props?.children, out);
  }
  return out;
}

function drawingOf(Icon) {
  const element = Icon({});
  const box = String(element.props.attr?.viewBox || '0 0 512 512').split(/\s+/).map(Number);
  return { box, paths: pathsOf(element.props.children) };
}

// Distance on the repeating tile: a sticker near one edge neighbours one near
// the other.
function wrappedDistance(a, b) {
  const dx = Math.min(Math.abs(a.x - b.x), TILE - Math.abs(a.x - b.x));
  const dy = Math.min(Math.abs(a.y - b.y), TILE - Math.abs(a.y - b.y));
  return Math.hypot(dx, dy);
}

// The stickers stand in diagonal files: a square grid turned 45°, every
// other row shifted half a step, all the same size. Which drawing stands
// where, and how it is turned, is left to chance, but never the same drawing
// next to itself, across the tile's edges too.
export function scatter() {
  const random = seededRandom('nat-1 sticker paper');
  const placed = [];
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < TILE / STEP; col += 1) {
      placed.push({
        x: col * STEP + (row % 2) * (STEP / 2),
        y: row * (STEP / 2),
        turn: Math.round((random() - 0.5) * 2 * TILT),
        drawing: -1,
      });
    }
  }
  const count = STICKER_DRAWINGS.length + 1;
  placed.forEach((sticker) => {
    const near = new Set();
    let d20Near = false;
    placed.forEach((other) => {
      if (other === sticker || other.drawing < 0) return;
      const distance = wrappedDistance(sticker, other);
      if (distance <= KEEP_APART) near.add(other.drawing);
      if (other.drawing === 0 && distance <= D20_KEEP_APART) d20Near = true;
    });
    // Index 0 is the d20, the rest the game icons.
    if (!d20Near && random() < D20_SHARE) {
      sticker.drawing = 0;
      return;
    }
    const free = [];
    for (let drawing = 1; drawing < count; drawing += 1) if (!near.has(drawing)) free.push(drawing);
    sticker.drawing = free.length ? free[Math.floor(random() * free.length)] : 1 + Math.floor(random() * (count - 1));
  });
  return placed;
}

// The tile as an SVG: each drawing defined once and placed with <use>, each
// sticker its solid shadow, then itself in the paper's colour, both edged in
// ink, and again one tile over wherever it crosses an edge, so the repeat
// shows no seam.
export function paperSvg() {
  const drawings = [D20, ...STICKER_DRAWINGS.map(drawingOf)];
  const symbols = drawings.map(({ box, paths }, index) => {
    const body = paths.map((path) => `<path d="${path.d}"${path.fill ? '' : ' fill="none"'}/>`).join('');
    return `<symbol id="s${index}" viewBox="${box.join(' ')}">${body}</symbol>`;
  }).join('');
  const uses = [];
  const shifts = [0, -TILE, TILE];
  const half = (SIZE / 2).toFixed(2);
  scatter().forEach((sticker) => {
    const width = drawings[sticker.drawing].box[2] || 512;
    const ink = ((INK * width) / SIZE).toFixed(1);
    shifts.forEach((sx) => shifts.forEach((sy) => {
      const x = sticker.x + sx;
      const y = sticker.y + sy;
      if (x < -SIZE || x > TILE + SIZE || y < -SIZE || y > TILE + SIZE) return;
      [[SHADOW, UI_COLORS.edge], [0, UI_COLORS.surfaceRaised]].forEach(([offset, fill]) => {
        uses.push(`<use href="#s${sticker.drawing}" x="-${half}" y="-${half}" width="${SIZE}" height="${SIZE}" fill="${fill}" stroke="${UI_COLORS.edge}" stroke-width="${ink}" stroke-linejoin="round" transform="translate(${(x + offset).toFixed(2)} ${(y + offset).toFixed(2)}) rotate(${sticker.turn})"/>`);
      });
    }));
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${TILE}" height="${TILE}" viewBox="0 0 ${TILE} ${TILE}"><defs>${symbols}</defs>${uses.join('')}</svg>`;
}
