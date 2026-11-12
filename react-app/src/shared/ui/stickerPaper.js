import { TILE } from './stickerLayout.js';

// The app's paper: the game's things (a d20, a sword, a potion, a key …)
// drawn all over it in diagonal files, as stickers on a notebook, cut out in
// ink with their solid shadow, a shade lighter than the page so they are
// felt more than seen. SURFACES.page lays it under every screen.
//
// One square tile the browser repeats, shipped as a picture in public/paper
// (1x and 2x WebP) and preloaded by index.html, so it is there with the page's
// first paint: painting it in the page held up the home die and showed the
// paper a moment late, and a vector background of hundreds of drawings
// lagged on scroll. Its layout and drawings live in stickerLayout.js; after
// changing them, run `node scripts/build-sticker-paper.mjs`.
const BASE = import.meta.env?.BASE_URL || '/';
const PICTURE = `${BASE}paper/sticker-paper`;

export const STICKER_PAPER = Object.freeze({
  image: `image-set(url("${PICTURE}.webp") 1x, url("${PICTURE}@2x.webp") 2x)`,
  size: `${TILE}px ${TILE}px`,
});
