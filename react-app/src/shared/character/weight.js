const WEIGHT_PRECISION = 1000;

export function itemQty(item) {
  return Math.max(1, Number(item?.qty ?? 1) || 1);
}

export function itemWeight(item) {
  return Number(item?.weight ?? 0) || 0;
}

export function roundWeight(value) {
  return Math.round(((Number(value) || 0) + Number.EPSILON) * WEIGHT_PRECISION) / WEIGHT_PRECISION;
}

export function totalInventoryWeight(inventory) {
  const total = (inventory || []).reduce((sum, item) => sum + itemWeight(item) * itemQty(item), 0);
  return roundWeight(total);
}

export function formatWeight(value) {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 3,
  }).format(roundWeight(value));
}
