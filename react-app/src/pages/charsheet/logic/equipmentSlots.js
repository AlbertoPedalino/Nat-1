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

function stableValue(value) {
  if (Array.isArray(value)) return `[${value.map(stableValue).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableValue(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function stackSignature(item) {
  const copy = { ...item };
  delete copy.qty;
  delete copy.equipped;
  delete copy.equippedSlot;
  return stableValue(copy);
}

function compactUnequippedStacks(inventory) {
  const next = [];
  const stackIndexes = new Map();

  (inventory || []).forEach((item) => {
    if (item.equipped || item.equippedSlot) {
      next.push(item);
      return;
    }

    const key = stackSignature(item);
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
