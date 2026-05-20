// Parse and aggregate magical item bonuses (weapons, armor, cloaks, rings,
// rods, wands, etc.) from inventory data fields. Single source of truth so
// attack/damage/AC/save/spell calculations stay consistent.

export function requiresAttunement(item) {
  return !!item?.reqAttune;
}

// An item-granted bonus is active only when the item is on the character's
// body AND, if it requires attunement, the user has flagged it attuned.
export function isItemBonusActive(item) {
  if (!item) return false;
  if (requiresAttunement(item) && !item.attuned) return false;
  return true;
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
  return (inventory || []).filter((item) => item?.equipped && isItemBonusActive(item));
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
