import { primaryClassLevel } from '../../../shared/character/progression/classLevel.js';

// The class the builder's class tab is on: tab 0 is the primary class, tab n
// the n-th extra class (null on the primary tab).
export function activeExtraClass(character) {
  const tab = character?.activeClassTab || 0;
  return tab > 0 ? character.extraClasses?.[tab - 1] || null : null;
}

// The character as the active tab's class alone — its class, level, subclass
// and features, no other classes — which is what the spell and slot panels
// compute from: each tab shows what that class has on its own.
export function activeClassCharacter(character) {
  const extra = activeExtraClass(character);
  if (!extra) return { ...character, classLevel: primaryClassLevel(character), extraClasses: [] };
  return {
    ...character,
    className: extra.name,
    classSource: extra.source,
    classLevel: extra.level || 1,
    level: extra.level || 1,
    cls: extra.cls,
    clsSnapshot: extra.clsSnapshot || null,
    subclassShortName: extra.subclassShortName || '',
    subclasses: extra.subclasses || [],
    allFeatures: extra.allFeatures || [],
    allSubFeatures: extra.allSubFeatures || [],
    extraClasses: [],
  };
}
