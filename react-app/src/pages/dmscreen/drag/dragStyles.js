import { OFFSET_X_VAR, OFFSET_Y_VAR, SLIDE_VAR } from './dragMotion.js';
import { writeLiveStyle } from '../../../shared/ui/liveStyle.js';

// The imperative half of the drag: the only place in the page that writes
// styles on a card outside React (through writeLiveStyle). It writes custom
// properties, never `transform`, so the card's own `sx` keeps owning the
// property itself.

export function writeOffset(element, x, y, slideMs = 0) {
  if (!element) return;
  writeLiveStyle(element, { [SLIDE_VAR]: `${slideMs}ms`, [OFFSET_X_VAR]: x, [OFFSET_Y_VAR]: y });
}

export function clearOffset(element, slideMs = 0) {
  writeOffset(element, 0, 0, slideMs);
}
