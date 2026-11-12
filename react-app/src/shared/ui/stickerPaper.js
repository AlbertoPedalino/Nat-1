import { UI_COLORS } from './colors.js';
import { STICKER_DRAWINGS } from './gameIcons.js';
import { seededRandom } from '../seededRandom.js';

// The app's paper: the game's things (a d20, a sword, a potion, a key …)
// drawn small all over it, as stickers on a notebook — scattered at random,
// each turned its own way, cut out in ink with its solid shadow, a shade
// lighter than the page so they are felt more than seen. SURFACES.page lays it
// under every screen.
//
// One square tile, built once as an SVG image and repeated by the browser:
// each drawing is defined once and placed with <use>, so the image stays
// small, and the page gains no elements at all. The chance in it is seeded,
// so the paper is the same on every visit, and stickers crossing the tile's
// edges are drawn on both sides, so the repeat shows no seam.
// The step between stickers along a row; neighbours on a diagonal stand
// STEP/√2 apart. The tile holds a whole number of steps and an even number of
// rows, so the files run on across the repeat.
const STEP = 51;
// A wide tile, so its repeat is not seen as a pattern of its own.
const TILE = STEP * 16;
const ROWS = (TILE / STEP) * 2;
// Every sticker the same size; each turned its own way, up to TILT degrees.
const SIZE = 45;
const MAX_SIZE = SIZE;
const TILT = 15;
// The ink round a sticker and the offset of its shadow, in pixels.
const INK = 1.3;
const SHADOW = 1.5;

// A drawing's markup, read off the icon component's own element tree (an
// icon is a plain function returning its <svg>'s children).
function markupOf(node) {
  if (Array.isArray(node)) return node.map(markupOf).join('');
  if (!node || typeof node !== 'object') return '';
  const { children, ...attrs } = node.props || {};
  const attrText = Object.entries(attrs)
    .filter(([, value]) => value != null && typeof value !== 'object')
    .map(([key, value]) => ` ${key}="${value}"`)
    .join('');
  return `<${node.type}${attrText}>${markupOf(children)}</${node.type}>`;
}

// The d20, the app's own die, drawn plain for the paper: the icon sets' d20s
// are too detailed to read at sticker size. A hexagon, its middle face and
// the edges round it; the edges take the ink, not the fill.
const D20 = Object.freeze({
  viewBox: '0 0 100 100',
  markup: '<path d="M50 4L90 27V73L50 96L10 73V27Z"/>'
    + '<path fill="none" d="M50 30L73 67H27Z M50 30L10 27 M50 30L90 27 M50 30V4 M27 67L10 27 M27 67L10 73 M27 67L50 96 M73 67L90 27 M73 67L90 73 M73 67L50 96"/>',
});
// How often a sticker is the d20.
const D20_SHARE = 0.15;

function drawingOf(Icon) {
  const element = Icon({});
  return {
    viewBox: element.props.attr?.viewBox || '0 0 512 512',
    markup: markupOf(element.props.children),
  };
}

// No drawing stands near itself: within this distance every sticker is a
// different drawing. The d20 comes far more often than any other drawing, so
// it only keeps off its direct neighbours.
const KEEP_APART = STEP * 2.05;
const D20_KEEP_APART = STEP * 1.05;

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
function scatter() {
  const random = seededRandom('nat-1 sticker paper');
  const placed = [];
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < TILE / STEP; col += 1) {
      placed.push({
        x: col * STEP + (row % 2) * (STEP / 2),
        y: row * (STEP / 2),
        size: SIZE,
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

function buildPaper() {
  const drawings = [D20, ...STICKER_DRAWINGS.map(drawingOf)];
  const symbols = drawings
    .map((drawing, index) => `<symbol id="s${index}" viewBox="${drawing.viewBox}">${drawing.markup}</symbol>`)
    .join('');
  const uses = [];
  scatter().forEach((sticker) => {
    const [, , viewWidth] = drawings[sticker.drawing].viewBox.split(/\s+/).map(Number);
    const ink = ((INK * (viewWidth || 512)) / sticker.size).toFixed(1);
    const half = (sticker.size / 2).toFixed(2);
    const size = sticker.size.toFixed(2);
    // Drawn again one tile over wherever it crosses an edge.
    const shifts = [0, -TILE, TILE];
    shifts.forEach((sx) => shifts.forEach((sy) => {
      const x = sticker.x + sx;
      const y = sticker.y + sy;
      if (x < -MAX_SIZE || x > TILE + MAX_SIZE || y < -MAX_SIZE || y > TILE + MAX_SIZE) return;
      const use = (dx, fill) => `<use href="#s${sticker.drawing}" x="-${half}" y="-${half}" width="${size}" height="${size}" fill="${fill}" stroke="${UI_COLORS.edge}" stroke-width="${ink}" stroke-linejoin="round" transform="translate(${(x + dx).toFixed(2)} ${(y + dx).toFixed(2)}) rotate(${sticker.turn})"/>`;
      uses.push(use(SHADOW, UI_COLORS.edge), use(0, UI_COLORS.surfaceRaised));
    }));
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${TILE}" height="${TILE}" viewBox="0 0 ${TILE} ${TILE}"><defs>${symbols}</defs>${uses.join('')}</svg>`;
}

// The paper reaches the styles through a CSS variable, set once the tile is
// ready: the recipes stay plain strings, and a page painted before then shows
// the halftone alone.
const PAPER_VARIABLE = '--sticker-paper';

// Painted once into a bitmap and handed to the browser as a PNG: hundreds of
// vector drawings in a repeating SVG background are redrawn on every scroll
// and made the page lag; a bitmap tile is copied, never redrawn. At the
// screen's pixel density, so it stays sharp.
function paintPaper() {
  if (typeof document === 'undefined' || typeof Image !== 'function' || typeof URL.createObjectURL !== 'function') return;
  const svgUrl = URL.createObjectURL(new Blob([buildPaper()], { type: 'image/svg+xml' }));
  const image = new Image();
  image.onload = () => {
    const scale = Math.min(2, window.devicePixelRatio || 1);
    const canvas = document.createElement('canvas');
    canvas.width = TILE * scale;
    canvas.height = TILE * scale;
    const context = canvas.getContext('2d');
    if (!context) return;
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(svgUrl);
    canvas.toBlob((png) => {
      if (!png) return;
      document.documentElement.style.setProperty(PAPER_VARIABLE, `url("${URL.createObjectURL(png)}")`);
    }, 'image/png');
  };
  image.src = svgUrl;
}
// When the browser is idle, so the first screen is not held up.
if (typeof window !== 'undefined') {
  (window.requestIdleCallback || ((run) => window.setTimeout(run, 200)))(paintPaper);
}

export const STICKER_PAPER = Object.freeze({
  image: `var(${PAPER_VARIABLE}, none)`,
  size: `${TILE}px ${TILE}px`,
});
