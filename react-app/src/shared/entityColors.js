import { alpha } from '@mui/material';

// Canonical color coding for game entity kinds, shared by builder and sheet.
// Use these instead of hardcoding hex values when tagging an entity type.
export const ENTITY_COLORS = {
  class: '#d7ad52',
  subclass: '#70b7a6',
  species: '#b58fd9',
  background: '#d69245',
  feat: '#de675f',
  skill: '#58b879',
  tool: '#4d95d6',
  language: '#8ecae6',
};

// Neutral gold accent for headings/titles that are not tied to an entity kind
// (section headers, entry titles inside descriptions, generic highlights).
export const NEUTRAL_TONE = '#edd48a';

// Bordeaux accent for everything item/attunement related: item source chips on
// spells and the attune button/attuned state. Items are not an entity kind, so
// this lives apart from ENTITY_COLORS but follows the same "one hex" rule.
export const ITEM_ATTUNEMENT = '#a23b4d';

// Single recipe for the translucent tint+border chip look. Both the theme's
// MuiChip color overrides and entityChipSx derive from this, so the visual
// language stays in one place.
export function chipTintStyle(tone, { bgAlpha = 0.18, borderAlpha = 0.65, text = tone } = {}) {
  return {
    backgroundColor: alpha(tone, bgAlpha),
    borderColor: alpha(tone, borderAlpha),
    color: text,
  };
}

// Chip sx for tagging an entity kind. Border width/weight come from the theme's
// MuiChip root override; this only sets the kind's tint.
export function entityChipSx(kind) {
  return chipTintStyle(ENTITY_COLORS[kind] || ENTITY_COLORS.class);
}
