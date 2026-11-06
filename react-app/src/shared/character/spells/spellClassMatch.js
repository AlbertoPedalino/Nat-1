import { matchKey } from '../../content/nameKeys.js';

// Whether a spell is on a class's list: the class spell index first, then the
// spell record's own class lists.
export function spellMatchesClass(spell, className, classSpellIndex) {
  const classKey = matchKey(className);
  if (!classKey) return false;
  
  // 1. Check classSpellIndex first
  const indexed = classSpellIndex?.[classKey];
  if (Array.isArray(indexed) && indexed.includes(String(spell.name || '').toLowerCase())) return true;
  
  if (!spell.classes || typeof spell.classes !== 'object') return false;
  
  // 2. Check fromClassList format: { fromClassList: [{ name: "Cleric" }, ...] }
  const fromClassList = spell.classes.fromClassList || [];
  if (Array.isArray(fromClassList) && fromClassList.some((entry) => matchKey(entry?.name) === classKey)) return true;
  
  // 3. Check fromSubclass format: { fromSubclass: [{ class: { name: "Cleric" } }, ...] }
  const fromSubclass = spell.classes.fromSubclass || [];
  if (Array.isArray(fromSubclass) && fromSubclass.some((entry) => matchKey(entry?.class?.name) === classKey)) return true;
  
  // 4. Check classes.class format: { class: { "Cleric": {}, "Wizard": {} } } (5etools multi-source)
  const classObj = spell.classes.class || {};
  if (typeof classObj === 'object') {
    // classObj might have source as key: { "phb": { "Cleric": {}, "Wizard": {} } }
    const allClasses = Object.values(classObj).reduce((acc, obj) => {
      if (typeof obj === 'object') {
        return [...acc, ...Object.keys(obj || {})];
      }
      return acc;
    }, []);
    if (allClasses.some((clsName) => matchKey(clsName) === classKey)) return true;
    
    // Or might be flat: { "Cleric": {}, "Wizard": {} }
    if (Object.keys(classObj).some((clsName) => matchKey(clsName) === classKey)) return true;
  }
  
  // 5. Check direct classes array: { classes: ["Cleric", "Wizard"] }
  if (Array.isArray(spell.classes)) {
    if (spell.classes.some((entry) => {
      const entryName = typeof entry === 'string' ? entry : entry?.name || '';
      return matchKey(entryName) === classKey;
    })) return true;
  }
  
  return false;
}

export function spellMatchesAnyClass(spell, classes, classSpellIndex) {
  // If no classes specified, allow all spells (fallback for backward compatibility)
  // but only in SpellSelectionPanel context where it's safe
  if (!classes?.length) return false;
  return classes.some((className) => spellMatchesClass(spell, className, classSpellIndex));
}
