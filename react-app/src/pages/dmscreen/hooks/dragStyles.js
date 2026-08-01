import { OFFSET_X_VAR, OFFSET_Y_VAR, SLIDE_VAR } from '../logic/dragMotion.js';

// The imperative half of the drag: the only place in the page allowed to write
// styles on a card outside React. It writes custom properties, never
// `transform`, so the card's own `sx` keeps owning the property itself.

export function writeOffset(element, x, y, slideMs = 0) {
  if (!element) return;
  element.style.setProperty(SLIDE_VAR, `${slideMs}ms`);
  element.style.setProperty(OFFSET_X_VAR, `${x}px`);
  element.style.setProperty(OFFSET_Y_VAR, `${y}px`);
}

export function clearOffset(element, slideMs = 0) {
  writeOffset(element, 0, 0, slideMs);
}
