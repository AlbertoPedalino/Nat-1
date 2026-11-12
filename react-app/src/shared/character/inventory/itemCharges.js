import { clamp } from '../../numbers.js';
import { requiresAttunement } from './itemAttunement.js';
export function itemChargeMaximum(item) {
  const maximum = Number(item?.charges);
  return Number.isFinite(maximum) && maximum > 0 ? Math.floor(maximum) : 0;
}

export function itemChargeCurrent(item) {
  const maximum = itemChargeMaximum(item);
  if (!maximum) return 0;
  const stored = item?.chargesCurrent == null ? maximum : Number(item.chargesCurrent);
  return clamp(Number.isFinite(stored) ? Math.floor(stored) : maximum, 0, maximum);
}

export function shouldShowItemCharges(item) {
  if (!itemChargeMaximum(item)) return false;
  return !requiresAttunement(item) || Boolean(item.attuned);
}

export function withItemCharges(item, value) {
  const maximum = itemChargeMaximum(item);
  if (!maximum) return item;
  const parsed = Number(value);
  const current = Number.isFinite(parsed) ? Math.floor(parsed) : itemChargeCurrent(item);
  return {
    ...item,
    chargesCurrent: clamp(current, 0, maximum),
  };
}

export function setInventoryItemCharges(inventory, index, value) {
  const current = Array.isArray(inventory) ? inventory : [];
  if (!current[index] || !itemChargeMaximum(current[index])) return current;
  return current.map((item, itemIndex) => (
    itemIndex === index ? withItemCharges(item, value) : item
  ));
}
