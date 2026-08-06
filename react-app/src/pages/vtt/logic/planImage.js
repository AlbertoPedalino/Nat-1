// The browser's half of laying a dungeon's plan over its picture.
//
// The fitting itself is arithmetic and lives in shared/dungeon; this is the part
// that needs a canvas: turning an uploaded picture into something that can be
// asked how light a pixel is, and turning the answer into the grid a scene
// stores.

import { fitPlanToImage } from '../../../shared/dungeon/planFit.js';

// Big enough that a cell is still several pixels across on any export worth
// fitting, small enough that the search runs in a blink. A 6600px page carries
// no more information about where its walls are than a 1000px one does.
const FIT_WIDTH = 1000;

export async function loadImageBitmap(file) {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = () => reject(new Error(`"${file.name}" could not be read as a picture.`));
      image.src = url;
    });
    if (!image.naturalWidth || !image.naturalHeight) {
      throw new Error(`"${file.name}" has no size of its own.`);
    }
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

// A way to read the picture's lightness, plus the scale it was read at. Drawn
// once into a small canvas and kept as raw bytes: the fit asks for hundreds of
// thousands of pixels and going through the canvas API for each would be the
// whole cost of the exercise.
export function samplerFor(image, { width = FIT_WIDTH } = {}) {
  const scale = Math.min(1, width / image.naturalWidth);
  const w = Math.max(1, Math.round(image.naturalWidth * scale));
  const h = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('This browser would not give us a canvas to read the map with.');
  context.drawImage(image, 0, 0, w, h);
  const { data } = context.getImageData(0, 0, w, h);

  return {
    width: w,
    height: h,
    scale,
    // Transparent counts as dark: the plain export puts the dungeon on nothing
    // at all rather than on a background.
    sample(x, y) {
      if (x < 0 || y < 0 || x >= w || y >= h) return 0;
      const i = (y * w + x) * 4;
      const alpha = data[i + 3] / 255;
      return ((data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) / 255) * alpha;
    },
  };
}

const mod = (value, size) => ((value % size) + size) % size;

// The fit, said in the terms a scene keeps: how big a square is, where the
// lines fall, and which of its squares the plan's own cell (0, 0) is. The last
// one is what lets a room in the file become a place on the board.
export function gridFromFit(fit, imageScale = 1) {
  if (!fit) return null;
  const size = fit.cellSize / imageScale;
  const originX = fit.origin.x / imageScale;
  const originY = fit.origin.y / imageScale;
  const rounded = Math.max(8, Math.round(size));
  return {
    grid: {
      size: rounded,
      offsetX: Math.round(mod(originX, rounded)),
      offsetY: Math.round(mod(originY, rounded)),
    },
    // Cell (0, 0) of the plan, as a square of the scene's own grid.
    planOrigin: {
      col: Math.round((originX - mod(originX, rounded)) / rounded),
      row: Math.round((originY - mod(originY, rounded)) / rounded),
    },
    cellSize: size,
    fill: fit.fill,
    score: fit.score,
    confident: fit.confident,
  };
}

// Everything the import needs to know about a picture and the plan that came
// with it: null when the two do not go together, which is a thing that happens
// and must be said rather than papered over.
export async function fitPlanToPicture(file, plan) {
  const image = await loadImageBitmap(file);
  const sampler = samplerFor(image);
  const fit = fitPlanToImage(sampler, plan);
  if (!fit) return null;
  return gridFromFit(fit, sampler.scale);
}
