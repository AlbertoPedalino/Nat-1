import { UI_COLORS, uiAlpha, OPACITY } from './colors.js';
import { SURFACES } from './surfaces.js';
import { DURATIONS } from './motion.js';

// The two shapes a thing you can open or click takes inside a panel, each
// with one look and one hover, so the same kind of thing answers the cursor
// the same way everywhere.

// A card in a list (an action, a spell, a feature, an item, a sense): the
// drawn card, its edge lit in the accent under the cursor.
export const CARD_SX = Object.freeze({
  ...SURFACES.card,
  transition: `border-color ${DURATIONS.fast}ms ease`,
  '&:hover': { borderColor: UI_COLORS.accent },
});

// A stat tile (an ability score, Initiative, Proficiency Bonus, Inspiration, a
// speed): a box drawn on the page, on the header tint. `tone` colours its edge
// for a state (a penalty), `active` fills it with the accent (Inspiration
// held), `clickable` lights its edge under the cursor.
export function tileSx({ clickable = false, tone = null, active = false } = {}) {
  const edge = active ? UI_COLORS.accent : tone;
  return {
    ...SURFACES.panel,
    bgcolor: active ? uiAlpha(UI_COLORS.accent, OPACITY.fill) : UI_COLORS.surfaceHeader,
    ...(edge ? { borderColor: edge } : null),
    ...(clickable ? {
      cursor: 'pointer',
      transition: `border-color ${DURATIONS.fast}ms ease`,
      '&:hover': { borderColor: edge || UI_COLORS.accent },
    } : null),
  };
}

// A row of a table-like list (a saving throw, a skill): no frame, a wash of
// the accent under the cursor, with the same rounding and padding everywhere.
export const ROW_SX = Object.freeze({
  borderRadius: 1,
  px: 0.75,
  cursor: 'pointer',
  transition: `background-color ${DURATIONS.fast}ms ease`,
  '&:hover': { bgcolor: uiAlpha(UI_COLORS.accent, OPACITY.soft) },
});
