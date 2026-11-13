import { UI_COLORS } from './colors.js';
import { CONTROL_FONT_SIZES, FONT_SIZES, LINE_HEIGHTS } from './fonts.js';
import { CARD_PART_RULE_SX, CARD_SX } from './interactive.js';
import { scrollWellSx } from './surfaces.js';

// An entry's card — an action, a spell, an item — comes in two families with
// one anatomy: the same head (SpellCardTitle / ItemCardTitle: tone bar, icon,
// a name that scrolls under the finger), the same tags and the same opened
// body. What tells them apart is what the card means:
//
// - Owned: on the character (the sheet's actions, spells and inventory, the
//   builder's current inventory). A raised card (ENTRY_CARD_SX), its head row
//   (ENTRY_ROW_SX), its rollers and state controls (ENTRY_BUTTON_SX).
// - Pickable: offered to take (the spell pickers, the wizard's spellbook, the
//   builder's spell lists, items to add or to create). A ruled row of a list
//   in a scroll well (PickableRow), its one action at the right; one already
//   taken wears the theme's selected row.
//
// A card is yours; a row is yours for the taking.

export const ENTRY_CARD_SX = Object.freeze({ ...CARD_SX, overflow: 'hidden' });

// A list of owned cards that scrolls (the builder's current inventory): the
// sunken well, padded so the cards' own margins space them. A pickable list
// is a plain ScrollWell: its rows are ruled edge to edge.
export function entryCardWellSx(maxHeight) {
  return { ...scrollWellSx(maxHeight), p: 0.5 };
}

// The head's padding, the same in both families.
export const ENTRY_ROW_PADDING = Object.freeze({ px: 1.25, py: 1 });

export const ENTRY_ROW_SX = Object.freeze({
  display: 'flex',
  alignItems: 'center',
  gap: 1,
  ...ENTRY_ROW_PADDING,
  color: 'text.primary',
  cursor: 'pointer',
  minWidth: 0,
});

// The opened description at the foot of an entry, owned or pickable.
export const ENTRY_BODY_SX = Object.freeze({
  ...CARD_PART_RULE_SX,
  bgcolor: UI_COLORS.surfaceSunken,
  fontSize: FONT_SIZES.md,
  color: 'text.secondary',
  lineHeight: LINE_HEIGHTS.normal,
  ...ENTRY_ROW_PADDING,
});

// A roller or state control in an owned card's rows (Attack, Equip, Attune,
// Stash): the controls' small label.
export const ENTRY_BUTTON_SX = Object.freeze({
  fontSize: CONTROL_FONT_SIZES.small,
  minWidth: 0,
  py: 0.25,
  px: 0.75,
  lineHeight: LINE_HEIGHTS.snug,
  borderRadius: 1,
});

// A pickable row's one action (Add / Remove a spell, Add an item): the cards'
// small control (ENTRY_BUTTON_SX, the controls' small size like every button),
// wide enough that Add and Remove keep one width.
export const PICK_ACTION_SX = Object.freeze({
  ...ENTRY_BUTTON_SX,
  flexShrink: 0,
  minWidth: 56,
});
