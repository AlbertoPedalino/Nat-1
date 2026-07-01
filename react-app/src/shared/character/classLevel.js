// Canonical class-level accessors — the ONE home for two questions that were
// previously hand-copied across the builder, sheet and adapters:
//
//   primaryClassLevel(C)      → the character's primary-class level
//   classLevel(C, className)  → levels in a specific class (primary or multiclass)
//
// Centralizing these means the multiclass lookup and the fallbacks can never
// drift between call sites (a fix or a new rule lives in one place).
//
// Note on the primary level: a character stores its primary-class level on
// `classLevel`. When that's missing (older/partial records) we DERIVE it as the
// total character level minus the multiclass levels, rather than naively falling
// back to the total — otherwise a multiclass character would report its whole
// level as the primary class. Owner-scoped levels (an adapter's `ownerLevel`)
// and multiclass TOTAL level are deliberately NOT this module's concern.

export function primaryClassLevel(C) {
  const explicit = Number(C?.classLevel);
  if (Number.isFinite(explicit) && explicit > 0) return explicit;
  const total = Number(C?.level || 0) || 1;
  const extras = (C?.extraClasses || [])
    .filter((extra) => extra?.name)
    .reduce((sum, extra) => sum + (Number(extra.level) || 1), 0);
  return Math.max(1, total - extras);
}

export function classLevel(C, className) {
  const target = String(className || '').toLowerCase();
  if (String(C?.className || '').toLowerCase() === target) return primaryClassLevel(C);
  const extra = (C?.extraClasses || []).find(
    (ec) => String(ec?.name || '').toLowerCase() === target,
  );
  return Number(extra?.level || 0);
}
