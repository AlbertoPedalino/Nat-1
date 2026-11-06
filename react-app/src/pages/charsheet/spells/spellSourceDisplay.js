import { ENTITY_COLORS, ITEM_ATTUNEMENT } from '../../../shared/ui/entityColors.js';
import { featSlotOrigin } from '../../../shared/character/progression/featChoiceKeys.js';
import { lowerKey } from '../../../shared/content/nameKeys.js';

// A spell row's source tags: their colors, generic labels, and how the tags of
// merged duplicates combine.

// Display colors for spell-source tags. Entity-linked tags follow the canonical
// entity palette (shared/entityColors.js); the rest are spell-domain-only tags.
// Stored on the character with each source: never change these values.
export const SRC_COLOR = {
  class: ENTITY_COLORS.class,
  subclass: ENTITY_COLORS.subclass,
  species: ENTITY_COLORS.species,
  background: ENTITY_COLORS.background,
  feat: ENTITY_COLORS.feat,
  item: ITEM_ATTUNEMENT,
  granted: '#70b7a6',
  choice: '#9d7fb8',
  ritual: '#58b879',
  arcanum: '#d69245',
};

// Feats granted by a background/species slot are tagged with that entity's
// color so the chip shows where the feat came from (e.g. Magic Initiate via
// Acolyte → background orange). Free feat slots (ASI etc.) stay feat red.
export function featSlotTone(slotOrChoiceKey) {
  return SRC_COLOR[featSlotOrigin(slotOrChoiceKey)];
}

const GENERIC_SOURCE_LABELS = new Set([
  'class', 'subclass', 'species', 'feat', 'feature', 'granted', 'auto',
  'auto granted', 'always prepared', 'unknown', 'choice',
]);

export function isGenericSpellSourceLabel(label) {
  return GENERIC_SOURCE_LABELS.has(String(label || '').trim().toLowerCase());
}

// Keep a badge's label and color owned by the same source. Prefer an existing
// specific label so adding another grant only increments the source count.
export function mergeSpellSourceDisplay(existing = {}, incoming = {}, fallbackColor) {
  let primary = existing;
  let secondary = incoming;

  if (!existing.label || (isGenericSpellSourceLabel(existing.label) && incoming.label && !isGenericSpellSourceLabel(incoming.label))) {
    primary = incoming;
    secondary = existing;
  }

  return {
    label: primary.label || secondary.label || undefined,
    color: primary.color || secondary.color || fallbackColor,
  };
}

// Union of contributing sources across merged duplicates of the same spell,
// deduped by origin label. Lets the UI show every source a spell came from
// (e.g. a Forest Gnome Druid's Speak with Animals) on a single consolidated row.
export function unionSpellSources(a, b) {
  const out = [];
  const seen = new Set();
  [...(a || []), ...(b || [])].forEach((src) => {
    if (!src) return;
    const key = lowerKey(src.originLabel || src.label || '');
    if (!key || seen.has(key)) return;
    seen.add(key);
    out.push(src);
  });
  return out;
}
