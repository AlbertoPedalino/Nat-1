import { SURFACES } from './surfaces.js';
import { UI_SHADOWS } from './shadows.js';

// The paper of whatever floats over the battle map for a moment: its dialogs
// (SheetDialog's `surface="map"`), its menus (MapMenu), the roll log and the
// atmosphere picker. The map's glass in the ink edge, raised with the overlay
// shadow so it reads above the board's own panels. Defined here, in shared/ui,
// because SheetDialog needs it and shared code never imports a page; a screen
// only sizes or pads it.
export const MAP_PAPER_SX = Object.freeze({
  ...SURFACES.map,
  borderRadius: 1,
  boxShadow: UI_SHADOWS.overlay,
});
