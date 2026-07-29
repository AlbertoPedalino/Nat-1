export function itemChargeMaximum(item) {
  const maximum = Number(item?.charges);
  return Number.isFinite(maximum) && maximum > 0 ? Math.floor(maximum) : 0;
}

export function itemChargeCurrent(item) {
  const maximum = itemChargeMaximum(item);
  if (!maximum) return 0;
  const stored = item?.chargesCurrent == null ? maximum : Number(item.chargesCurrent);
  return Math.max(0, Math.min(maximum, Number.isFinite(stored) ? Math.floor(stored) : maximum));
}

export function shouldShowItemCharges(item) {
  if (!itemChargeMaximum(item)) return false;
  return !item?.reqAttune || Boolean(item.attuned);
}

export function withItemCharges(item, value) {
  const maximum = itemChargeMaximum(item);
  if (!maximum) return item;
  const parsed = Number(value);
  const current = Number.isFinite(parsed) ? Math.floor(parsed) : itemChargeCurrent(item);
  return {
    ...item,
    chargesCurrent: Math.max(0, Math.min(maximum, current)),
  };
}

export function setInventoryItemCharges(inventory, index, value) {
  const current = Array.isArray(inventory) ? inventory : [];
  if (!current[index] || !itemChargeMaximum(current[index])) return current;
  return current.map((item, itemIndex) => (
    itemIndex === index ? withItemCharges(item, value) : item
  ));
}
