export function getChoiceValue(C, key) {
  if (!C?.choices) return null;
  const match = Object.entries(C.choices).find(([k]) => k === key || k.replace(/^mc\d+_/, '') === key);
  if (!match) return null;
  const raw = match[1];
  return String(Array.isArray(raw) ? raw[0] : raw || '');
}

export function matchesChoiceRequirement(C, requirement) {
  if (!requirement) return true;
  const key = requirement.key;
  if (!key) return true;
  const raw = getChoiceValue(C, key);
  if (!raw) return false;
  const selected = raw.toLowerCase();
  const values = Array.isArray(requirement.value) ? requirement.value : [requirement.value];
  return values.some((v) => String(v).toLowerCase() === selected);
}

export function inventoryHasFlag(inventory, requirement) {
  if (!requirement || !inventory) return false;
  const spec = typeof requirement === 'string' ? { flag: requirement } : requirement;
  const flag = spec.flag;
  if (!flag) return true;
  const itemType = spec.itemType;
  const requireEquipped = spec.equipped === true;
  return inventory.some((item) => {
    if (requireEquipped && !item.equipped) return false;
    if (itemType) {
      const type = String(item.type || '').toUpperCase();
      const types = Array.isArray(itemType) ? itemType : [itemType];
      if (!types.some((t) => String(t).toUpperCase() === type)) return false;
    }
    return (item.flags || []).includes(flag);
  });
}

export function hasActionRequirement(action, C, sheet) {
  if (typeof action?.condition === 'function') {
    try { if (!action.condition(C)) return false; } catch { return false; }
  }
  if (action.requiresChoice) {
    if (!matchesChoiceRequirement(C, action.requiresChoice)) return false;
  }
  if (action.choiceKey && action.model) {
    const raw = getChoiceValue(C, action.choiceKey);
    if (!raw) return false;
    const selected = raw.toLowerCase();
    const models = Array.isArray(action.model) ? action.model : [action.model];
    if (!models.some((m) => String(m).toLowerCase() === selected)) return false;
  }
  if (action.requiresInventoryFlag) {
    const inv = sheet?.sheetInventory || C?.inventory || [];
    if (!inventoryHasFlag(inv, action.requiresInventoryFlag)) return false;
  }
  return true;
}
