// Several floor plans laid out as one picture.
//
// A two-storey building is sometimes two scenes and sometimes one board with
// both floors on it — the second reads better when the party is split, or when
// a stair is a thing you point at rather than a scene switch. The layout is
// worked out in numbers here and drawn in the thin wrapper below it, so the part
// that can be wrong can also be tested.

// Canvases have a ceiling, and it is lower than the sum of eight storeys at
// export resolution. Past this the whole row is scaled down rather than being
// silently cropped, or refused for a reason nobody can act on.
export const MAX_CANVAS_DIMENSION = 12000;

// The gap between floors, as a share of the tallest one: a hairline on a small
// plan and a corridor on a big one is the same gap to the eye.
export const DEFAULT_GAP_RATIO = 0.03;

// Left to right, centred on the tallest. Every floor keeps its own scale, so a
// cellar smaller than the hall above it stays smaller — the plans are of the
// same building and their sizes mean something.
export function rowLayout(sizes, { gapRatio = DEFAULT_GAP_RATIO, maxDimension = MAX_CANVAS_DIMENSION } = {}) {
  const usable = (sizes || []).filter((size) => size?.width > 0 && size?.height > 0);
  if (!usable.length) return null;

  const tallest = Math.max(...usable.map((size) => size.height));
  const gap = Math.round(tallest * Math.max(0, gapRatio));
  const rowWidth = usable.reduce((total, size) => total + size.width, 0) + gap * (usable.length - 1);
  const scale = Math.min(1, maxDimension / rowWidth, maxDimension / tallest);

  let x = 0;
  const placements = usable.map((size) => {
    const placement = {
      x: Math.round(x * scale),
      // Centred rather than sitting on a shared floor line: a building read as
      // one picture has no ground, and the eye lines up the middles.
      y: Math.round(((tallest - size.height) / 2) * scale),
      width: Math.round(size.width * scale),
      height: Math.round(size.height * scale),
    };
    x += size.width + gap;
    return placement;
  });

  return {
    width: Math.max(1, Math.round(rowWidth * scale)),
    height: Math.max(1, Math.round(tallest * scale)),
    scale,
    placements,
  };
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      // An SVG without an intrinsic size draws as nothing at all, and a blank
      // floor is worse than being told to export PNGs.
      if (!image.naturalWidth || !image.naturalHeight) {
        reject(new Error(`"${file.name}" has no size of its own — export it as PNG to join it with the others.`));
        return;
      }
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`"${file.name}" could not be read as a picture.`));
    };
    image.src = url;
  });
}

// The floors as one PNG. The background is painted rather than left
// transparent: the gap between two plans is part of the map now, and a hole
// through to the page behind it is not what a board looks like.
export async function stitchImages(files, {
  name = 'floors.png', background = '#12100e', gapRatio = DEFAULT_GAP_RATIO,
} = {}) {
  const list = [...(files || [])];
  if (list.length < 2) throw new Error('Joining floors takes at least two pictures.');

  const images = await Promise.all(list.map(loadImage));
  const layout = rowLayout(images.map((image) => ({
    width: image.naturalWidth, height: image.naturalHeight,
  })), { gapRatio });
  if (!layout) throw new Error('Those pictures have no size to lay out.');

  const canvas = document.createElement('canvas');
  canvas.width = layout.width;
  canvas.height = layout.height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('This browser would not give us a canvas to join them on.');
  context.fillStyle = background;
  context.fillRect(0, 0, canvas.width, canvas.height);
  images.forEach((image, index) => {
    const at = layout.placements[index];
    context.drawImage(image, at.x, at.y, at.width, at.height);
  });

  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (result) => (result ? resolve(result) : reject(new Error('The joined map could not be encoded.'))),
      'image/png',
    );
  });
  return new File([blob], name, { type: 'image/png' });
}
