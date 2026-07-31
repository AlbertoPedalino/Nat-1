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

// Dedicated accent for structured rich-text descriptions. Kept separate from
// entity, action, spell-tag, and item-state colors so highlighted rules text
// never implies one of those semantic meanings.
export const RICH_TEXT_ACCENT = '#b7d36b';

// Action-economy accents (action / bonus action / reaction). Deliberately
// outside every entity-kind hue (teal/violet/blue/etc.) so action type never
// reads as an entity. Shared by the Actions tab category bar and the spell
// tab's cast-time chip, so a given action type looks identical everywhere.
export const ACTION_COLORS = {
  action: '#22c7e0',   // vivid electric cyan (kept clear of the muted subclass teal)
  bonus: '#6f8fd8',    // steel blue
  reaction: '#c46fd9', // orchid purple
};

// Spell-tag mini-chip accents (Concentration / Ritual) shown next to spell
// names everywhere: sheet spell card, builder lists, picker dialogs and the
// wizard spellbook. One home so the chip reads identically across all of them.
export const SPELL_TAG_COLORS = {
  concentration: '#e07a9e', // rose, kept clear of the species/choice violets
  ritual: '#58b879',        // green
};

// Semantic tones for the action-tab entry chips. Muted on purpose so a chip
// reads as a status/fact, never as an entity-kind tag. `info` = neutral fact
// (weapon hand, range, duration, save DC…), `positive`/`negative` = good/bad
// status (Active vs Suppressed, proficient vs not), `mastery` = active mastery.
export const CHIP_TONES = {
  info: '#A7B1BD',
  positive: '#A8D8B9',
  negative: '#E7A6A1',
  mastery: '#D7C37A',
};

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

// Standard tint for the action-tab entry chips (tag chips + Active/Suppressed
// status). One alpha config so every such chip reads identically; pass a
// CHIP_TONES value.
export function chipToneStyle(tone) {
  return chipTintStyle(tone, { bgAlpha: 0.14, borderAlpha: 0.55 });
}
