import { inventoryStackKey, isInventoryItemStackable } from '../../../shared/character/inventory/itemIdentity.js';

export function itemProps(item) {
  return [...(Array.isArray(item?.property) ? item.property : []), ...(Array.isArray(item?.properties) ? item.properties : [])]
    .map(p => String(p).toLowerCase());
}

function hasAnyProperty(item, ...wanted) {
  const props = itemProps(item);
  const wantedNorm = wanted.flat().map(p => String(p).toLowerCase());
  return props.some(p => wantedNorm.includes(p));
}

export function isWeapon(item) {
  return item && ['M', 'R'].includes(String(item.type || '').toUpperCase());
}

export function isLightWeapon(item) {
  return hasAnyProperty(item, 'l', 'light');
}

export function isVersatileWeapon(item) {
  return hasAnyProperty(item, 'v', 'versatile');
}

export function isTwoHandedWeapon(item) {
  return hasAnyProperty(item, '2h', 'twohanded', 'two-handed');
}

export function canOneHand(item) {
  return !isTwoHandedWeapon(item);
}

export function isThrownWeapon(item) {
  return hasAnyProperty(item, 't', 'thrown');
}

export function isHeavyWeapon(item) {
  return hasAnyProperty(item, 'h', 'heavy');
}

export function isFinesseWeapon(item) {
  return hasAnyProperty(item, 'f', 'fin', 'finesse');
}

export function isReachWeapon(item) {
  return hasAnyProperty(item, 'r', 'reach');
}

// Base weapon name, so a "+1 Spear" or a "Light Crossbow of Warning" still
// counts as the weapon it is built on.
function baseWeaponName(item) {
  return String(item?.baseItem || item?.name || '').split('|')[0].toLowerCase();
}

export function isCrossbow(item) {
  return item?.crossbow === true || /\bcrossbow\b/.test(baseWeaponName(item));
}

// The weapons Polearm Master names: a Quarterstaff, a Spear, or a weapon with
// the Heavy and Reach properties.
export function isPolearmMasterWeapon(item) {
  const name = baseWeaponName(item);
  return /\bquarterstaff\b/.test(name) || /\bspear\b/.test(name)
    || (isHeavyWeapon(item) && isReachWeapon(item));
}

export function hasEquippedShield(inventory) {
  return (inventory || []).some((i) => i.equipped && String(i.type || '').split('|')[0].toUpperCase() === 'S');
}

// True if a weapon or Shield is currently held in a hand. Used by Fighting Style:
// Unarmed Fighting (d8 die only when not wielding any weapon or a Shield).
export function isWieldingWeaponOrShield(inventory) {
  const list = inventory || [];
  const shield = list.some((i) => i.equipped && String(i.type || '').toUpperCase() === 'S');
  const weapon = list.some((i) => ['mainHand', 'offHand', 'twoHands'].includes(i.equippedSlot) && isWeapon(i));
  return shield || weapon;
}

export function canTwoHand(item) {
  return isTwoHandedWeapon(item) || isVersatileWeapon(item);
}

export function getVersatileDamageDice(item) {
  return item?.damage?.[1]?.damage || item?.dmg2 || '';
}

export function getOneHandDamageDice(item) {
  return item?.damage?.[0]?.damage || item?.dmg1 || item?.damageDice || item?.dmg || '';
}

export function getWeaponDamageDice(item, equippedSlot) {
  if (equippedSlot === 'twoHands' && isVersatileWeapon(item)) {
    return getVersatileDamageDice(item) || getOneHandDamageDice(item);
  }
  return getOneHandDamageDice(item);
}

export function getEquippedMainHandWeapon(inventory) {
  return (inventory || []).find(i => i.equippedSlot === 'mainHand');
}

export function getEquippedOffHandWeapon(inventory) {
  return (inventory || []).find(i => i.equippedSlot === 'offHand');
}

export function getEquippedTwoHandedWeapon(inventory) {
  return (inventory || []).find(i => i.equippedSlot === 'twoHands');
}

export function getEquippedShield(inventory) {
  return (inventory || []).find(i => i.equipped && i.type === 'S');
}

export function hasTwoWeaponFightingStyle(C) {
  const nc = C?.normalizedChoices;
  if (nc?.feats?.selected) {
    const found = nc.feats.selected.some(f => {
      const s = String(f || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      return s.includes('twoweaponfighting');
    });
    if (found) return true;
  }
  const choices = C?.choices || {};
  return Object.values(choices).some(val => {
    const str = String(val || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    return str === 'twoweaponfighting';
  });
}

export function getOffHandDamageMod(abilityMod, hasTwoWeaponFightingStyle) {
  if (hasTwoWeaponFightingStyle) return abilityMod;
  return abilityMod < 0 ? abilityMod : 0;
}

export function canUseLightExtraAttack(C, inventory) {
  const offHand = getEquippedOffHandWeapon(inventory);
  if (!offHand) return false;
  const explicitMain = getEquippedMainHandWeapon(inventory);
  const mainWeapon = explicitMain || (inventory || []).find(i =>
    i.equipped && isWeapon(i) && !i.equippedSlot
  );
  if (!mainWeapon) return false;
  return isLightWeapon(mainWeapon) && isLightWeapon(offHand);
}

export function getSlotConflictWarnings(inventory) {
  const warnings = [];
  const hasTwoHandedWeapon = (inventory || []).some(i => i.equippedSlot === 'twoHands');
  const hasShield = (inventory || []).some(i => i.equipped && i.type === 'S');
  const hasOffHandWeapon = (inventory || []).some(i => i.equippedSlot === 'offHand');

  if (hasTwoHandedWeapon && hasShield) {
    warnings.push('Two-handed weapon with shield: cannot use both.');
  }
  if (hasTwoHandedWeapon && hasOffHandWeapon) {
    warnings.push('Two-handed weapon with off-hand weapon: cannot use both.');
  }
  return warnings;
}

function itemQty(item) {
  return Math.max(1, Number(item?.qty ?? 1) || 1);
}

function unequipItem(item) {
  const next = { ...item, equipped: false };
  delete next.equippedSlot;
  return next;
}

function compactUnequippedStacks(inventory) {
  const next = [];
  const stackIndexes = new Map();

  (inventory || []).forEach((item) => {
    if (!isInventoryItemStackable(item)) {
      next.push(item);
      return;
    }

    const key = inventoryStackKey(item);
    const existingIndex = stackIndexes.get(key);
    if (existingIndex === undefined) {
      stackIndexes.set(key, next.length);
      next.push({ ...item, qty: itemQty(item), equipped: false });
      return;
    }

    next[existingIndex] = {
      ...next[existingIndex],
      qty: itemQty(next[existingIndex]) + itemQty(item),
    };
  });

  return next;
}

export function equipToSlot(inventory, index, slot) {
  const target = inventory[index];
  if (!target) return inventory;

  if (target.equippedSlot === slot) {
    return compactUnequippedStacks(inventory.map((item, idx) => (
      idx === index ? unequipItem(item) : item
    )));
  }

  const next = [];
  inventory.forEach((item, idx) => {
    if (idx === index) {
      const count = itemQty(item);
      if (count > 1) {
        next.push(unequipItem({ ...item, qty: count - 1 }));
      }
      next.push({ ...item, qty: 1, equipped: true, equippedSlot: slot });
      return;
    }

    if (slot === 'twoHands' && (item.equippedSlot === 'mainHand' || item.equippedSlot === 'offHand')) {
      next.push(unequipItem(item));
      return;
    }

    if ((slot === 'mainHand' || slot === 'offHand') && item.equippedSlot === 'twoHands') {
      next.push(unequipItem(item));
      return;
    }

    if (item.equippedSlot === slot) {
      next.push(unequipItem(item));
      return;
    }

    next.push(item);
  });

  return compactUnequippedStacks(next);
}
