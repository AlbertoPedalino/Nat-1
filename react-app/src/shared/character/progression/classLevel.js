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

// Levels in multiclasses. A multiclass slot without a class yet counts
// nothing; one with a class but no level counts 1, as the builder adds it.
// `except` leaves out one slot (the one being edited).
export function multiclassLevels(extraClasses, { except = -1 } = {}) {
  return (extraClasses || [])
    .filter((extra, index) => index !== except && extra?.name)
    .reduce((sum, extra) => sum + (Number(extra.level) || 1), 0);
}

// The character's total level: the stored level, else primary + multiclasses.
export function totalLevel(C) {
  const stored = Number(C?.level);
  if (Number.isFinite(stored) && stored > 0) return Math.min(20, Math.floor(stored));
  const primary = Number(C?.classLevel);
  return Math.min(20, Math.max(1, (primary > 0 ? primary : 1) + multiclassLevels(C?.extraClasses)));
}

export function primaryClassLevel(C) {
  const explicit = Number(C?.classLevel);
  if (Number.isFinite(explicit) && explicit > 0) return explicit;
  const total = Number(C?.level || 0) || 1;
  return Math.max(1, total - multiclassLevels(C?.extraClasses));
}

export function classLevel(C, className) {
  const target = String(className || '').toLowerCase();
  if (String(C?.className || '').toLowerCase() === target) return primaryClassLevel(C);
  const extra = (C?.extraClasses || []).find(
    (ec) => String(ec?.name || '').toLowerCase() === target,
  );
  return Number(extra?.level || 0);
}

// Each class the character has (primary first, then multiclasses), with its
// subclass and level: the owners whose adapter actions/resources apply.
export function classEntities(C) {
  if (!C) return [];
  const out = [];
  if (C.className) {
    out.push({
      className: C.className,
      subclassShortName: C.subclassShortName || '',
      level: primaryClassLevel(C),
      ownerName: C.className,
      allSubFeatures: C.allSubFeatures || [],
    });
  }
  (C.extraClasses || []).forEach((extra) => {
    if (!extra?.name) return;
    out.push({
      className: extra.name,
      subclassShortName: extra.subclassShortName || '',
      level: Number(extra.level || 1),
      ownerName: extra.name,
      allSubFeatures: extra.allSubFeatures || [],
    });
  });
  return out;
}

// The names of the character's classes, primary first.
export function classNames(C) {
  return [C?.className, ...(C?.extraClasses || []).map((extra) => extra?.name)].filter(Boolean);
}
