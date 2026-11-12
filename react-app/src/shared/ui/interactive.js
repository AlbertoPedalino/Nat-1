import { UI_COLORS } from './colors.js';
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

// An expandable card (an action, a spell, an item): the whole card wears
// CARD_SX — so its edge and lift wrap the title, the rows under it and the
// opened description together — and its parts are only split by this rule.
export const CARD_PART_RULE_SX = Object.freeze({ borderTop: 1, borderColor: 'divider' });

// The hairline between the rows of a long list (compendium results, a
// catalog): thin on purpose, a frame would be noise at that density.
export const LIST_ROW_RULE_SX = Object.freeze({ borderBottom: 1, borderColor: 'divider' });

// The hairline between two columns of one box (an ability's score and its
// modifier).
export const COLUMN_RULE_SX = Object.freeze({ borderLeft: 1, borderColor: 'divider' });

// Raised means pressed: what can be clicked stands up like a button (an ink
// edge, a solid shadow under it, a hop under the cursor); what is only read
// lies flat. Panels and cards are sheets laid on the page (their diagonal
// shadow), not buttons.


// A value read inside a panel (a hit point line's name): flat, the ink edge on
// a light wash. `clickable` (it opens its details) lights its edge under the
// cursor; `tone` colours the edge for a state (a penalty).
export function readoutSx({ clickable = false, tone = null } = {}) {
  return {
    ...SURFACES.wash,
    ...(tone ? { borderColor: tone } : null),
    ...(clickable ? {
      cursor: 'pointer',
      transition: `border-color ${DURATIONS.fast}ms ease`,
      '&:hover': { borderColor: UI_COLORS.accent },
    } : null),
  };
}

// A figure read on its own (an inventory total, the builder's ability
// score): a readout on the header tint. What is pressed is a stat tile
// (charsheet StatTile) or a button.
export function tileSx({ tone = null } = {}) {
  return { ...readoutSx({ tone }), bgcolor: UI_COLORS.surfaceHeader };
}

// A <button> that wears no button look of its own: a card, a row, a chip or a
// strip entry that is clicked, its own sx drawing it. The browser's button
// chrome taken off, the text and the cursor of what it stands in.
export const BARE_BUTTON_SX = Object.freeze({
  appearance: 'none',
  background: 'none',
  border: 0,
  p: 0,
  m: 0,
  color: 'inherit',
  font: 'inherit',
  textAlign: 'left',
  cursor: 'pointer',
});
