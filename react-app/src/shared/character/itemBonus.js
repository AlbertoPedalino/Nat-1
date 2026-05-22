// Parse and aggregate magical item bonuses (weapons, armor, cloaks, rings,
// rods, wands, etc.) from inventory data fields. Single source of truth so
// attack/damage/AC/save/spell calculations stay consistent.

export function requiresAttunement(item) {
  return !!item?.reqAttune;
}

// Item types that must be held/worn in an equip slot for their bonuses to
// apply (weapons must be wielded, armor must be worn, focuses/wands/rods/staves
// must be held). Other magic items (rings, cloaks, belts, boots, goggles,
// amulets, etc.) become active on attunement alone — attunement implies
// wearing per RAW and they have no dedicated equip slot in our model.
const HELD_OR_WORN_TYPES = new Set(['M', 'R', 'LA', 'MA', 'HA', 'S', 'WEAPON', 'ARMOR', 'WD', 'RD', 'ST', 'SCF']);

function requiresEquipForBonus(item) {
  return HELD_OR_WORN_TYPES.has(String(item?.type || '').toUpperCase());
}

// An item-granted bonus is active depending on item kind:
//   - Held/worn-slot items: must be `equipped`; if they also require
//     attunement, must additionally be `attuned`.
//   - Slotless magic items requiring attunement: active on `attuned` alone.
//   - Slotless items without attunement: need `equipped` (mundane bag/pack
//     items rarely carry numeric bonuses; included for completeness).
export function isItemBonusActive(item) {
  if (!item) return false;
  if (requiresAttunement(item)) {
    if (!item.attuned) return false;
    return requiresEquipForBonus(item) ? !!item.equipped : true;
  }
  return !!item.equipped;
}

export function parseSignedBonus(value) {
  if (value == null) return 0;
  const cleaned = String(value).replace(/[^\d+-]/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

export function formatSignedBonus(value) {
  const n = Number(value) || 0;
  return n >= 0 ? `+${n}` : `${n}`;
}

export function weaponEnhancement(item) {
  if (!isItemBonusActive(item)) return { attack: 0, damage: 0 };
  return {
    attack: parseSignedBonus(item?.bonusWeaponAttack ?? item?.bonusWeapon),
    damage: parseSignedBonus(item?.bonusWeaponDamage ?? item?.bonusWeapon),
  };
}

export function armorEnhancement(item) {
  if (!isItemBonusActive(item)) return 0;
  return parseSignedBonus(item?.bonusAc);
}

function activeEquippedItems(inventory) {
  return (inventory || []).filter((item) => isItemBonusActive(item));
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
    .filter((item) => !['LA', 'MA', 'HA', 'S'].includes(String(item.type || '').toUpperCase()))
    .reduce((sum, item) => sum + parseSignedBonus(item.bonusAc), 0);
}

// Sum `bonusSavingThrow` across all equipped items. 5etools tags apply to all
// save categories unless qualified, so we aggregate to a single +N.
export function aggregateSavingThrowBonus(inventory) {
  return sumField(inventory, 'bonusSavingThrow');
}

// Sum `bonusAbilityCheck` across all equipped items (Cloak of Protection-like).
export function aggregateAbilityCheckBonus(inventory) {
  return sumField(inventory, 'bonusAbilityCheck');
}

// Spellcasting focuses (Wand of the War Mage +1 etc.).
export function aggregateSpellBonuses(inventory) {
  return {
    spellAttack: sumField(inventory, 'bonusSpellAttack'),
    spellSaveDc: sumField(inventory, 'bonusSpellSaveDc'),
  };
}

// Count items currently attuned. Use to surface RAW 3-attunement-slot limit.
export function countAttunedItems(inventory) {
  return (inventory || []).filter((item) => requiresAttunement(item) && item?.attuned).length;
}
