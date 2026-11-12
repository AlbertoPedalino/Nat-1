import { useCallback, useEffect, useMemo, useRef } from 'react';
import { THROWN_SLOT, equipToSlot as equipToSlotHelper } from './equipmentSlots.js';
import { toggleItemFlag } from '../../../shared/character/inventory/itemFlags.js';
import {
  addInventoryEntries,
  setOneInventoryUnitCarried,
} from '../../../shared/character/inventory/itemContainers.js';
import { toggleItemAttunement } from '../../../shared/character/inventory/itemAttunement.js';
import { extractTomeBonus } from '../../../shared/character/inventory/itemEffects.js';
import { writeOnScroll } from '../../../shared/character/inventory/spellScrolls.js';
import { isItemCarried, itemQty } from '../../../shared/character/inventory/weight.js';
import {
  itemChargeCurrent,
  itemChargeMaximum,
  setInventoryItemCharges,
} from '../../../shared/character/inventory/itemCharges.js';
import { isBodyArmor, isShield } from '../../../shared/character/inventory/itemKinds.js';

function normalizeStoredItem(item) {
  const {
    _itemType,
    _searchName,
    _searchText,
    _sourcePriority,
    _rarityPriority,
    quantity: _sourceQuantity,
    weightLb: _sourceWeightLb,
    carried: _sourceCarried,
    equipped: _sourceEquipped,
    equippedSlot: _sourceEquippedSlot,
    attuned: _sourceAttuned,
    ...baseItem
  } = item || {};
  const carried = _sourceCarried !== false;
  return {
    ...baseItem,
    name: baseItem.name,
    source: baseItem.source || 'Custom',
    type: baseItem.type || 'gear',
    rarity: baseItem.rarity || 'none',
    weight: Number(baseItem.weight ?? 0),
    value: Number(baseItem.value || 0),
    qty: itemQty(baseItem),
    equipped: carried && !!_sourceEquipped,
    custom: !!baseItem.custom,
    ...(carried && _sourceEquippedSlot ? { equippedSlot: _sourceEquippedSlot } : {}),
    ...(carried && _sourceAttuned ? { attuned: true } : {}),
    ...(!carried ? { carried: false } : {}),
  };
}

// Every change the inventory tab makes to the item list: adding from the
// database or the custom form, and what each row's buttons do. The handlers
// read the latest list through a ref, so they stay stable for the memoized
// rows while quantities tick.
export function useInventoryActions({
  inv, itemsDb, character: C, attunementState, onUpdateInventory, onUpdateCharacter, onNotice,
}) {
  const invRef = useRef(inv);

  useEffect(() => {
    invRef.current = inv;
  }, [inv]);

  const updateInv = useCallback((next) => onUpdateInventory?.(next), [onUpdateInventory]);

  const addItem = useCallback((item, count = 1) => {
    if (!item?.name) return;
    const current = invRef.current || [];
    const qtyToAdd = Math.max(1, Number(count) || 1);
    updateInv(addInventoryEntries(current, [{ ...item, qty: qtyToAdd }], itemsDb, normalizeStoredItem));
  }, [itemsDb, updateInv]);

  const adjustQty = useCallback((index, delta) => {
    const current = invRef.current || [];
    const target = current[index];
    if (!target) return;
    // A stack readied to throw stays one stack; anything else equipped is a single unit.
    const singleUnit = (target.equipped || target.equippedSlot) && target.equippedSlot !== THROWN_SLOT;
    if (delta > 0 && (singleUnit || itemChargeMaximum(target) > 0)) {
      const unequippedCopy = { ...target, qty: delta, equipped: false };
      delete unequippedCopy.equippedSlot;
      if (itemChargeMaximum(target) > 0) {
        delete unequippedCopy.attuned;
        delete unequippedCopy.chargesCurrent;
      }
      updateInv(addInventoryEntries(current, [unequippedCopy]));
      return;
    }
    const next = current.flatMap((item, idx) => {
      if (idx !== index) return [item];
      const nextQty = Math.max(0, itemQty(item) + delta);
      return nextQty > 0 ? [{ ...item, qty: nextQty }] : [];
    });
    updateInv(next);
  }, [updateInv]);

  const removeItem = useCallback((index) => {
    const current = invRef.current || [];
    updateInv(current.filter((_, idx) => idx !== index));
  }, [updateInv]);

  const toggleEquipped = useCallback((index) => {
    const current = invRef.current || [];
    const target = current[index];
    if (!target || !isItemCarried(target)) return;
    // One suit of armor and one shield at a time: equipping one takes off the other.
    const next = current.map((item, idx) => {
      if (idx === index) return { ...item, equipped: !item.equipped };
      if (isBodyArmor(target) && isBodyArmor(item) && item.equipped) return { ...item, equipped: false };
      if (isShield(target) && isShield(item) && item.equipped) return { ...item, equipped: false };
      return item;
    });
    updateInv(next);
  }, [updateInv]);

  const equipToSlot = useCallback((index, slot) => {
    const current = invRef.current || [];
    if (!isItemCarried(current[index])) return;
    const next = equipToSlotHelper(current, index, slot);
    updateInv(next);
  }, [updateInv]);

  const adjustCharges = useCallback((index, delta) => {
    const current = invRef.current || [];
    const target = current[index];
    if (!target) return;
    updateInv(setInventoryItemCharges(current, index, itemChargeCurrent(target) + delta));
  }, [updateInv]);

  const toggleCarried = useCallback((index) => {
    const current = invRef.current || [];
    const target = current[index];
    if (!target) return;
    updateInv(setOneInventoryUnitCarried(current, index, !isItemCarried(target)));
  }, [updateInv]);

  const toggleFlag = useCallback((index, def) => {
    const current = invRef.current || [];
    const next = toggleItemFlag(current, index, def);
    if (next !== current) updateInv(next);
  }, [updateInv]);

  const toggleAttuned = useCallback((index, { curseBroken = false } = {}) => {
    const current = invRef.current || [];
    const result = toggleItemAttunement(current, index, {
      ...attunementState,
      character: C,
      curseBroken,
    });
    if (result.status === 'limit') {
      onNotice?.('Attunement limit', `You can attune to at most ${attunementState.limit} items. End attunement on another item first.`);
      return;
    }
    if (result.status === 'duplicate') {
      onNotice?.('Attunement duplicate', 'You cannot attune to more than one copy of the same magic item.');
      return;
    }
    if (result.status === 'requirement') {
      onNotice?.('Attunement requirement', result.eligibility?.reason || 'This character does not meet the attunement requirement.');
      return;
    }
    if (result.status === 'cursed') {
      onNotice?.('Cursed item', 'Attunement cannot be ended voluntarily. Break the curse first.');
      return;
    }
    if (result.status === 'not-carried') {
      onNotice?.('Attunement unavailable', 'Carry the item before attuning to it.');
      return;
    }
    if (result.status === 'updated') updateInv(result.inventory);
  }, [C, attunementState, updateInv, onNotice]);

  const setAbilityChoice = useCallback((index, groupIdx, abilities) => {
    const current = invRef.current || [];
    const next = current.map((item, idx) => {
      if (idx !== index) return item;
      const prev = item.abilityChoice && typeof item.abilityChoice === 'object' ? { ...item.abilityChoice } : {};
      prev[groupIdx] = abilities;
      return { ...item, abilityChoice: prev };
    });
    updateInv(next);
  }, [updateInv]);

  // What is written on a Spell Scroll (its spell, DC, attack): see
  // writeOnScroll for how a stack splits and joins.
  const writeScroll = useCallback((index, patch) => {
    updateInv(writeOnScroll(invRef.current || [], index, patch));
  }, [updateInv]);

  const consumeTome = useCallback((index) => {
    const current = invRef.current || [];
    const target = current[index];
    const bonus = extractTomeBonus(target);
    if (!bonus || !onUpdateCharacter) return;
    onUpdateCharacter((prev) => {
      const existing = Array.isArray(prev?.consumedItemBonuses) ? prev.consumedItemBonuses : [];
      return { ...prev, consumedItemBonuses: [...existing, bonus] };
    });
    const nextInv = current.flatMap((item, idx) => {
      if (idx !== index) return [item];
      const nextQty = Math.max(0, itemQty(item) - 1);
      return nextQty > 0 ? [{ ...item, qty: nextQty }] : [];
    });
    updateInv(nextInv);
    onNotice?.(`Read ${target.name}`, `Permanent +${bonus.value} to ${bonus.ability.toUpperCase()}`);
  }, [updateInv, onUpdateCharacter, onNotice]);

  // Stable for the memoized rows: every row receives the same object.
  const rowActions = useMemo(() => ({
    qty: adjustQty,
    charges: adjustCharges,
    remove: removeItem,
    equip: toggleEquipped,
    equipSlot: equipToSlot,
    carried: toggleCarried,
    toggleFlag,
    attune: toggleAttuned,
    abilityChoice: setAbilityChoice,
    writeScroll,
    consumeTome,
  }), [adjustQty, adjustCharges, removeItem, toggleEquipped, equipToSlot, toggleCarried, toggleFlag, toggleAttuned, setAbilityChoice, writeScroll, consumeTome]);

  return { addItem, rowActions };
}
