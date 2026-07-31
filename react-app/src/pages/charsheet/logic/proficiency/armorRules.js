import { normKey } from './weaponRules.js';

export const ARMOR_KIND_KEYS = {
  LA: { kind: 'Light Armor', set: new Set(['light', 'lightarmor']) },
  MA: { kind: 'Medium Armor', set: new Set(['medium', 'mediumarmor']) },
  HA: { kind: 'Heavy Armor', set: new Set(['heavy', 'heavyarmor']) },
  S: { kind: 'Shield', set: new Set(['shield', 'shields']) },
};

export function getArmorKindEntry(item) {
  return ARMOR_KIND_KEYS[String(item?.type || '').toUpperCase()] || null;
}

export function armorSetTrainsKind(armorSet, entry) {
  if (!entry) return true;
  return Array.from(armorSet).some((label) => entry.set.has(normKey(label)));
}
