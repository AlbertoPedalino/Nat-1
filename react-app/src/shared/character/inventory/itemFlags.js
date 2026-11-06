import { classLevel } from '../progression/classLevel.js';
import { warlockHasInvocation } from '../progression/warlockUtils.js';
import { lowerKey } from '../../content/nameKeys.js';

// Item flags a feature lets the player set on an inventory item (Pact Weapon,
// Arcane Armor…). Adapters declare them with `registerItemFlagDef(key, def)`:
//
//   label / activeLabel   button text, unset / set
//   tone                  button accent
//   types                 item types the flag may go on (5etools `type`)
//   maxCount              items that may hold the flag at once (1 = it moves)
//   requireClass          class the character needs levels in
//   requireMinLevel       minimum level in that class
//   requireSubclass       subclass of that class (short name)
//   requireInvocation     Eldritch Invocation the character must know
//
// Rules effects read the flag itself (`requiresInventoryFlag`, weapon overrides);
// this module only decides who may set it and on what.

export function itemFlagsOf(item) {
  return Array.isArray(item?.flags) ? item.flags : [];
}

export function hasItemFlag(item, flag) {
  return itemFlagsOf(item).includes(flag);
}

function hasSubclass(C, className, subclass) {
  const cls = lowerKey(className);
  const sub = lowerKey(subclass);
  if (lowerKey(C?.className) === cls && lowerKey(C?.subclassShortName) === sub) return true;
  return (C?.extraClasses || []).some((extra) => lowerKey(extra?.name) === cls && lowerKey(extra?.subclassShortName) === sub);
}

export function itemFlagDefAvailable(def, C) {
  if (!def?.key || !C) return false;
  if (def.requireClass) {
    const level = classLevel(C, def.requireClass);
    if (level <= 0) return false;
    if (def.requireMinLevel && level < def.requireMinLevel) return false;
    if (def.requireSubclass && !hasSubclass(C, def.requireClass, def.requireSubclass)) return false;
  }
  if (def.requireInvocation && !warlockHasInvocation(C, def.requireInvocation)) return false;
  return true;
}

// The flag definitions this character can use, from every registered one.
export function availableItemFlagDefs(defs, C) {
  return (defs || []).filter((def) => itemFlagDefAvailable(def, C));
}

export function itemFlagFitsItem(def, item) {
  if (!def || !item) return false;
  const types = (def.types || []).map((type) => String(type).toUpperCase());
  return !types.length || types.includes(String(item.type || '').toUpperCase());
}

// Sets or clears `def.key` on inventory[index]. With `maxCount: 1` setting it
// moves the flag off every other item; with a higher limit a full count refuses.
// Returns the same array when nothing changes.
export function toggleItemFlag(inventory, index, def) {
  const list = Array.isArray(inventory) ? inventory : [];
  const target = list[index];
  if (!def?.key || !itemFlagFitsItem(def, target)) return list;
  const flag = def.key;
  const without = (item) => ({ ...item, flags: itemFlagsOf(item).filter((value) => value !== flag) });
  if (hasItemFlag(target, flag)) return list.map((item, idx) => (idx === index ? without(item) : item));
  const max = Number(def.maxCount) || Infinity;
  const holders = list.filter((item) => hasItemFlag(item, flag)).length;
  if (max === 1) {
    return list.map((item, idx) => {
      if (idx === index) return { ...item, flags: [...itemFlagsOf(item), flag] };
      return hasItemFlag(item, flag) ? without(item) : item;
    });
  }
  if (holders >= max) return list;
  return list.map((item, idx) => (idx === index ? { ...item, flags: [...itemFlagsOf(item), flag] } : item));
}
