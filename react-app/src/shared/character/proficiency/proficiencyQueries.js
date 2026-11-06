import { formatRule, weaponMatchesRule } from './weaponRules.js';
import {
  ARMOR_KIND_KEYS,
  armorSetTrainsKind,
  getArmorKindEntry,
} from './armorRules.js';
import { requireEquipmentSets } from './equipmentSets.js';
import { isWeaponItem } from '../inventory/itemCodes.js';

export function getWeaponProficiencyInfo(character, item, weaponOverride, equipmentSets) {
  if (!item || !isWeaponItem(item)) return { proficient: true, source: '' };
  if (weaponOverride?.grantsProficiency) return { proficient: true, source: weaponOverride.label || weaponOverride.key || '' };
  const { weaponRules } = requireEquipmentSets(equipmentSets, 'getWeaponProficiencyInfo');
  const matched = weaponRules.find((rule) => weaponMatchesRule(item, rule));
  if (matched) return { proficient: true, source: formatRule(matched) };
  return { proficient: false, source: '' };
}

export function getArmorTrainingInfo(character, item, armorOverride, equipmentSets) {
  const entry = getArmorKindEntry(item);
  if (!entry) return { trained: true, kind: '' };
  if (armorOverride?.grantsTraining) {
    return { trained: true, kind: entry.kind, source: armorOverride.label || armorOverride.key || '' };
  }
  const { armorSet } = requireEquipmentSets(equipmentSets, 'getArmorTrainingInfo');
  return { trained: armorSetTrainsKind(armorSet, entry), kind: entry.kind };
}

export function getUntrainedArmor(character, inventory, equipmentSets) {
  const sets = requireEquipmentSets(equipmentSets, 'getUntrainedArmor');
  return (inventory || [])
    .filter((item) => item.equipped && ARMOR_KIND_KEYS[String(item.type || '').toUpperCase()])
    .map((item) => ({ item, info: getArmorTrainingInfo(character, item, null, sets) }))
    .filter((entry) => !entry.info.trained);
}

export function hasNonProficientArmor(character, inventory, equipmentSets) {
  return getUntrainedArmor(character, inventory, equipmentSets)
    .some(({ item }) => {
      const t = String(item.type || '').toUpperCase();
      return t === 'LA' || t === 'MA' || t === 'HA';
    });
}

