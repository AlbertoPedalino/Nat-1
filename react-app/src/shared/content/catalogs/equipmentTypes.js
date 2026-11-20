import { byName } from '../../lists.js';
import { isMeleeWeapon, isWeaponItem, itemBaseType, weaponCategory } from '../../character/inventory/itemKinds.js';

// Maps 5etools `equipmentType` codes (exactly as they appear in startingEquipment
// data) to a predicate selecting the concrete items a player may pick for that
// slot. Add a new code here + a label in EquipmentStep to support more grants.
export const EQUIPMENT_TYPE_MATCHERS = Object.freeze({
  focusSpellcastingArcane: (item) => item.scfType === 'arcane',
  focusSpellcastingDruidic: (item) => item.scfType === 'druid',
  focusSpellcastingHoly: (item) => item.scfType === 'holy',
  instrumentMusical: (item) => itemBaseType(item) === 'INS',
  setGaming: (item) => itemBaseType(item) === 'GS',
  toolArtisan: (item) => itemBaseType(item) === 'AT',
  weaponSimple: (item) => weaponCategory(item) === 'simple' && isWeaponItem(item),
  weaponSimpleMelee: (item) => weaponCategory(item) === 'simple' && isMeleeWeapon(item),
  weaponMartial: (item) => weaponCategory(item) === 'martial' && isWeaponItem(item),
  weaponMartialMelee: (item) => weaponCategory(item) === 'martial' && isMeleeWeapon(item),
});

// Concrete items the player can pick for an `equipmentType` slot (e.g. setGaming
// → the individual gaming sets). Excludes the synthetic generic group parents so
// the user chooses a real item instead of a generic placeholder.
export function equipmentTypeCandidates(code, items) {
  const matcher = EQUIPMENT_TYPE_MATCHERS[code];
  if (!matcher) return [];
  return (items || [])
    .filter((item) => item && !item.generatedGroupParent && matcher(item))
    .sort(byName);
}
