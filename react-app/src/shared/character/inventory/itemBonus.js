// Parse and aggregate magical item bonuses (weapons, armor, cloaks, rings,
// rods, wands, etc.) from inventory data fields. Single source of truth so
// attack/damage/AC/save/spell calculations stay consistent.

import { isItemEffectActive } from './itemAttunement.js';
import { itemEffectInventory } from '../forms/wildShapeForm.js';
import { isArmorOrShield } from './itemKinds.js';

export function parseSignedBonus(value) {
  if (value == null) return 0;
  const cleaned = String(value).replace(/[^\d+-]/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

export function weaponEnhancement(item) {
  if (!isItemEffectActive(item)) return { attack: 0, damage: 0 };
  return {
    attack: parseSignedBonus(item?.bonusWeaponAttack ?? item?.bonusWeapon),
    damage: parseSignedBonus(item?.bonusWeaponDamage ?? item?.bonusWeapon),
  };
}

// The extra damage a weapon's own text adds on a hit ("an extra
// {@damage 2d12} Cold damage"): 5etools has no field for it. Each is rolled
// apart from the weapon's damage, because many hold only sometimes (against
// Undead, spending a charge, while transformed): the player rolls it when
// it applies.
export function weaponExtraDamage(item) {
  if (!isItemEffectActive(item)) return [];
  const text = JSON.stringify(item?.entries || []);
  const seen = new Set();
  const out = [];
  for (const match of text.matchAll(/extra \{@damage ([^|}]+)[^}]*\} ([A-Za-z]+) damage/gi)) {
    const formula = match[1].trim();
    const type = match[2].toLowerCase();
    const key = `${formula}|${type}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ formula, type });
  }
  return out;
}

export function armorEnhancement(item) {
  if (!isItemEffectActive(item)) return 0;
  return parseSignedBonus(item?.bonusAc);
}

function activeEquippedItems(inventory) {
  return (inventory || []).filter((item) => isItemEffectActive(item));
}

function sumField(inventory, field) {
  return activeEquippedItems(inventory)
    .reduce((sum, item) => sum + parseSignedBonus(item[field]), 0);
}

// Sum `bonusAc` across all equipped items that aren't body armor / shield
// (those are already folded into armor AC + shield bonus). Captures Cloak of
// Protection, Ring of Protection, etc.
export function aggregateMiscAcBonus(inventory) {
  return activeEquippedItems(inventory)
    .filter((item) => !isArmorOrShield(item))
    .reduce((sum, item) => sum + parseSignedBonus(item.bonusAc), 0);
}

// Sum `bonusSavingThrow` across all equipped items. 5etools tags apply to all
// save categories unless qualified, so we aggregate to a single +N.
function aggregateSavingThrowBonus(inventory) {
  return sumField(inventory, 'bonusSavingThrow');
}

// Sum `bonusAbilityCheck` across all equipped items (Cloak of Protection-like).
function aggregateAbilityCheckBonus(inventory) {
  return sumField(inventory, 'bonusAbilityCheck');
}

// Spellcasting focuses (Wand of the War Mage +1 etc.).
function aggregateSpellBonuses(inventory) {
  return {
    spellAttack: sumField(inventory, 'bonusSpellAttack'),
    spellSaveDc: sumField(inventory, 'bonusSpellSaveDc'),
  };
}

// The flat item bonuses that count for a character: none while Wild Shaped
// (the equipment merges into the form). Character-level callers read these,
// never the inventory sums above, so the form rule cannot be missed.
export function characterItemBonuses(C, inventory = C?.inventory) {
  const items = itemEffectInventory(C, inventory);
  return {
    savingThrow: aggregateSavingThrowBonus(items),
    abilityCheck: aggregateAbilityCheckBonus(items),
    ...aggregateSpellBonuses(items),
  };
}
