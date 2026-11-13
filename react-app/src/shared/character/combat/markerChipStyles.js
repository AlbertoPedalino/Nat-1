import { CONTROL_HEIGHTS } from '../../ui/controlHeights.js';
import { FONT_SIZES, LINE_HEIGHTS } from '../../ui/fonts.js';
import { OPACITY, washImage } from '../../ui/colors.js';
import { inkShadow } from '../../ui/shadows.js';
import { chipTintStyle } from '../../ui/entityColors.js';

// One look for a creature's markers — its conditions and its reminders — on
// the character sheet, the encounter builder and the battle map's piece menu.
// A marker is either ON the creature or OFFERED to put on it (a condition not
// set, a reminder used before), and the two must never be mistaken for each
// other:
//
// - on: tinted in its accent (conditions orange, reminders blue), its edge in
//   the accent; open (its rules card showing) it is washed deeper and casts
//   its solid shadow, as a selected thing anywhere.
// - offered: the theme's clickable chip, the raised neutral button, its edge
//   lit in the accent under the cursor. No tint: colour means "in force".
//
// The edge is the same 2px either way (the ink edge's width), so switching a
// chip on does not move its neighbours.

export function markerOnSx(accent, { open = false } = {}) {
  return {
    ...chipTintStyle(accent, { bgAlpha: open ? OPACITY.line : OPACITY.fill, borderAlpha: 1 }),
    borderWidth: 2,
    borderStyle: 'solid',
    boxShadow: open ? inkShadow(accent, 2) : 'none',
    '& .MuiChip-deleteIcon': { color: accent, '&:hover': { color: accent } },
  };
}

// Under the cursor, for an on marker that does something when clicked (opens
// its card).
export function markerOnHoverSx(accent) {
  return { '&:hover': { backgroundImage: washImage(accent, OPACITY.shade) } };
}

export function markerOfferedSx(accent) {
  return {
    cursor: 'pointer',
    '&:hover': { borderColor: accent },
  };
}

// How big markers run on each surface — the only thing the surfaces vary.
// `row`: an encounter combatant's marker rows. `panel`: the character sheet's
// Conditions and Reminders panels. `menu`: the map's piece menu, two columns
// side by side.
export const MARKER_DENSITY = Object.freeze({
  row: Object.freeze({ height: CONTROL_HEIGHTS.sm, fontSize: FONT_SIZES.xs }),
  panel: Object.freeze({ height: CONTROL_HEIGHTS.sm, fontSize: FONT_SIZES.xxs }),
  menu: Object.freeze({
    height: CONTROL_HEIGHTS.sm,
    fontSize: FONT_SIZES.xxs,
    '& .MuiChip-label': { px: 0.5, lineHeight: LINE_HEIGHTS.none },
  }),
});

export function markerDensitySx(density = 'row') {
  return MARKER_DENSITY[density] || MARKER_DENSITY.row;
}
