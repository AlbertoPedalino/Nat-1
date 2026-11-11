import { UI_COLORS, uiAlpha, OPACITY } from './colors.js';
import { SURFACES } from './surfaces.js';
import { DURATIONS } from './motion.js';
import { inkOn } from './pressable.js';

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

// An expandable card (an action, a spell, an item): the whole card wears
// CARD_SX — so its edge and lift wrap the title, the rows under it and the
// opened description together — and its parts are only split by this rule.
export const CARD_PART_RULE_SX = Object.freeze({ borderTop: 1, borderColor: 'divider' });

// A stat tile (an ability score, Initiative, Proficiency Bonus, Inspiration, a
// speed): a box drawn on the page, on the header tint. `tone` colours its edge
// for a state (a penalty), `active` fills it with the accent (Inspiration
// held: filled solid, its text in the ink that reads on it — TILE_ACTIVE_INK),
// `clickable` lights its edge under the cursor.
export const TILE_ACTIVE_INK = inkOn(UI_COLORS.accent);

export function tileSx({ clickable = false, tone = null, active = false } = {}) {
  return {
    ...SURFACES.panel,
    bgcolor: active ? UI_COLORS.accent : UI_COLORS.surfaceHeader,
    ...(active ? { color: TILE_ACTIVE_INK } : null),
    ...(tone ? { borderColor: tone } : null),
    ...(clickable ? {
      cursor: 'pointer',
      transition: `border-color ${DURATIONS.fast}ms ease, background-color ${DURATIONS.fast}ms ease`,
      '&:hover': active ? { bgcolor: UI_COLORS.accentText } : { borderColor: tone || UI_COLORS.accent },
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
