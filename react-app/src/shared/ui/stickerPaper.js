import { BASE_PALETTE_ID } from './colors.js';
import { publicAsset } from '../publicAsset.js';
import { TILE } from './stickerLayout.js';

// The app's paper: the game's things (a d20, a sword, a potion, a key …)
// drawn all over it in diagonal files, as stickers on a notebook, cut out in
// ink with their solid shadow, a shade lighter than the page so they are
// felt more than seen. SURFACES.page lays it under every screen, in a style
// whose paper is 'stickers' (shapes.js surface.paper).
//
// One square tile the browser repeats, shipped as a picture in public/paper
// (1x and 2x WebP) and preloaded by index.html, so it is there with the page's
// first paint: painting it in the page held up the home die and showed the
// paper a moment late, and a vector background of hundreds of drawings
// lagged on scroll. Its layout and drawings live in stickerLayout.js; after
// changing them, run `node scripts/build-sticker-paper.mjs`.
//
// The picture is painted in a palette's colours, so each palette has its own
// (PAPER_PICTURES: the palette's id → the file's name in public/paper); a
// palette without one yet lays the base palette's.
export const PAPER_PICTURES = Object.freeze({
  dark: 'sticker-paper',
  light: 'sticker-paper-light',
});


export const STICKER_PAPER_SIZE = `${TILE}px ${TILE}px`;

export function stickerPaperImage(paletteId = BASE_PALETTE_ID) {
  const picture = publicAsset(`paper/${PAPER_PICTURES[paletteId] || PAPER_PICTURES[BASE_PALETTE_ID]}`);
  return `image-set(url("${picture}.webp") 1x, url("${picture}@2x.webp") 2x)`;
}
