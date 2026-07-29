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
