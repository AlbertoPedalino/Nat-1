import { clamp } from '../../numbers.js';
// Canonical class-level accessors — the ONE home for two questions that were
// previously hand-copied across the builder, sheet and adapters:
//
//   primaryClassLevel(C)      → the character's primary-class level
//   classLevel(C, className)  → levels in a specific class (primary or multiclass),
//                               a class skin counting as its base class
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
  return clamp((primary > 0 ? primary : 1) + multiclassLevels(C?.extraClasses), 1, 20);
}

export function primaryClassLevel(C) {
  const explicit = Number(C?.classLevel);
  if (Number.isFinite(explicit) && explicit > 0) return explicit;
  const total = Number(C?.level || 0) || 1;
  return Math.max(1, total - multiclassLevels(C?.extraClasses));
}

// The class whose rules a class follows: a World of Warcraft skin's base class
// ("Death Knight" -> "Paladin", from its `reskinOf`), else the class itself.
// `entry` is the character (primary class) or an extra class.
export function ruleClassName(entry, className = entry?.className || entry?.name) {
  return (entry?.cls || entry?.clsSnapshot)?.ruleClass?.name || className || '';
}

// Levels in a class, by its name or by the class it reskins: a Hunter (skin of
// the Ranger) has Ranger levels for every rule that asks for them.
export function classLevel(C, className) {
  const target = String(className || '').toLowerCase();
  if (!target) return 0;
  return classEntities(C)
    .filter((entity) => entity.className.toLowerCase() === target || entity.ruleClassName.toLowerCase() === target)
    .reduce((sum, entity) => sum + entity.level, 0);
}

// Each class the character has (primary first, then multiclasses), with its
// subclass and level: the owners whose adapter actions/resources apply.
// `isPrimary`, `extraIndex` (its index in extraClasses, null for the primary)
// and `choicePrefix` ('' or "mcN_", the prefix of its stored choices) say where
// it lives; `entry` is the object holding it (the character, or the extra
// class) for its feature lists.
export function classEntities(C) {
  if (!C) return [];
  const out = [];
  if (C.className) {
    out.push({
      className: C.className,
      ruleClassName: ruleClassName(C, C.className),
      subclassShortName: C.subclassShortName || '',
      level: primaryClassLevel(C),
      ownerName: C.className,
      allSubFeatures: C.allSubFeatures || [],
      isPrimary: true,
      extraIndex: null,
      choicePrefix: '',
      entry: C,
    });
  }
  (C.extraClasses || []).forEach((extra, index) => {
    if (!extra?.name) return;
    out.push({
      className: extra.name,
      ruleClassName: ruleClassName(extra, extra.name),
      subclassShortName: extra.subclassShortName || '',
      level: Number(extra.level || 1),
      ownerName: extra.name,
      allSubFeatures: extra.allSubFeatures || [],
      isPrimary: false,
      extraIndex: index,
      choicePrefix: `mc${index}_`,
      entry: extra,
    });
  });
  return out;
}

// Every class and subclass feature of every class the character has, in
// class order (a class's own features, then its subclass's). The builder's
// live list (`allFeatures`) comes before the one saved with a sheet
// (`allClassFeatures`).
export function characterClassFeatures(C) {
  return classEntities(C).flatMap(({ entry }) => [
    ...(entry?.allFeatures || entry?.allClassFeatures || []),
    ...(entry?.allSubFeatures || []),
  ]);
}

// Whether the character has a class or subclass feature by name at its
// current level ("Circle Forms").
export function hasClassFeature(C, featureName) {
  const wanted = String(featureName || '').trim().toLowerCase();
  if (!wanted) return false;
  return classEntities(C).some((entity) => [
    ...(entity.entry?.allFeatures || entity.entry?.allClassFeatures || []),
    ...(entity.entry?.allSubFeatures || []).filter((feature) => feature?.subclassShortName === entity.subclassShortName),
  ].some((feature) => String(feature?.name || '').trim().toLowerCase() === wanted && Number(feature?.level || 0) <= entity.level));
}

// The names of the character's classes, primary first.
export function classNames(C) {
  return [C?.className, ...(C?.extraClasses || []).map((extra) => extra?.name)].filter(Boolean);
}
