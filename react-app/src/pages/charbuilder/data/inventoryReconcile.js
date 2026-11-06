import { resolveReplicateCraftedItem } from '../../../shared/character/inventory/replicateMagicItem.js';
import { itemKey } from './itemRecords.js';

// Fields refreshed from the items DB on inventory reconciliation. Keeping the
// list explicit avoids stomping on user-managed state (qty, equipped, carried,
// attuned, equippedSlot, flags, custom).
const RECONCILED_ITEM_FIELDS = [
  'ability', 'modifySpeed', 'senses',
  'resist', 'immune', 'vulnerable', 'conditionImmune',
  'bonusAc', 'bonusSavingThrow', 'bonusAbilityCheck',
  'bonusSpellAttack', 'bonusSpellSaveDc',
  'bonusWeapon', 'bonusWeaponAttack', 'bonusWeaponDamage',
  'bonusProficiencyBonus', 'attachedSpells', 'spellScrollLevel',
  'reqAttune', 'reqAttuneAlt', 'reqAttuneTags', 'property', 'mastery', 'miscTags', 'entries',
  'charges', 'recharge', 'rechargeAmount',
  'rarity', 'weight', 'value', 'type', 'weaponCategory', 'sourceAlias', 'curse',
  'dmg1', 'dmg2', 'dmgType', 'ac', 'strength', 'stealth',
  'scfType', 'focus', 'items', 'group',
  'baseItem', 'variantName', 'variantSource',
];

// Refresh structured effect fields on persisted inventory items by re-merging
// from the live items database. Preserves user-managed flags (qty, equipped,
// carried, attuned, equippedSlot, custom flags).
export function reconcileInventoryWithItemsDb(inventory, itemsDb) {
  const current = Array.isArray(inventory) ? inventory : [];
  if (!Array.isArray(itemsDb) || itemsDb.length === 0) return current;
  const byKey = new Map();
  itemsDb.forEach((item) => {
    if (!item?.name) return;
    byKey.set(itemKey(item.name, item.source || ''), item);
  });
  let changed = false;
  const next = current.map((stored) => {
    if (!stored?.name || stored.custom) return stored;
    const fresh = resolveReplicateCraftedItem(stored, itemsDb)
      || byKey.get(itemKey(stored.name, stored.source || ''));
    if (!fresh) return stored;
    const patch = {};
    RECONCILED_ITEM_FIELDS.forEach((field) => {
      if (fresh[field] !== undefined) patch[field] = fresh[field];
    });
    const merged = { ...stored, ...patch };
    if (RECONCILED_ITEM_FIELDS.some((f) => stored[f] !== merged[f])) changed = true;
    return merged;
  });
  return changed ? next : current;
}
