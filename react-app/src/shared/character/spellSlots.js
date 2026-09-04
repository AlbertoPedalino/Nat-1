export function getCreatedSpellSlots(sheet) {
  return (sheet?.createdSpellSlots) || {};
}

export function getPactSlotUsedKey(level) {
  return `pact:${Number(level || 0)}`;
}

export function getRegularSlotUsed(used, level) {
  return Number((used || {})[String(level)] || 0);
}

export function getPactSlotUsed(used, level) {
  const source = used || {};
  const key = getPactSlotUsedKey(level);
  return Number(source[key] || 0);
}

export function recoverPactSlots(usedSlots, level, amount) {
  const before = Math.max(0, getPactSlotUsed(usedSlots, level));
  const recovered = Math.min(before, Math.max(0, Number(amount) || 0));
  if (!recovered) return null;

  const used = { ...(usedSlots || {}) };
  used[getPactSlotUsedKey(level)] = before - recovered;
  return { used, recovered };
}

export function getAvailablePactSlots(pactSlots, sheet) {
  const level = Number(pactSlots?.level || 0);
  const total = Math.max(0, Number(pactSlots?.count || 0));
  if (!level || !total) return 0;
  return Math.max(0, total - getPactSlotUsed(sheet?.spellSlotUsed, level));
}

export function getAvailableRegularSlots(regularSlots, sheet, level) {
  const idx = Number(level) - 1;
  if (idx < 0 || idx >= regularSlots.length) return 0;
  const max = Number(regularSlots[idx] || 0);
  const used = getRegularSlotUsed(sheet?.spellSlotUsed, level);
  const created = Number((sheet?.createdSpellSlots?.[level]) || 0);
  return Math.max(0, max - used + created);
}

export function persistCreatedSlots(createdSlots, onUpdateSheet, onUpdateCharacter) {
  if (typeof onUpdateSheet === 'function') onUpdateSheet({ createdSpellSlots: createdSlots });
  if (typeof onUpdateCharacter === 'function') onUpdateCharacter((prev) => ({ ...prev, createdSpellSlots: createdSlots }));
}

export function consumeSlot(regularSlots, sheet, level, onUpdateSheet, onUpdateCharacter) {
  const idx = Number(level) - 1;
  if (idx < 0 || idx >= regularSlots.length) return false;
  const max = Number(regularSlots[idx] || 0);
  const used = getRegularSlotUsed(sheet?.spellSlotUsed, level);
  const created = Number((sheet?.createdSpellSlots?.[level]) || 0);
  const available = max - used + created;
  if (available <= 0) return false;

  if (created > 0) {
    const next = { ...(sheet?.createdSpellSlots || {}) };
    next[level] = created - 1;
    if (next[level] <= 0) delete next[level];
    persistCreatedSlots(next, onUpdateSheet, onUpdateCharacter);
  } else {
    const next = { ...(sheet?.spellSlotUsed || {}) };
    next[level] = used + 1;
    if (typeof onUpdateSheet === 'function') onUpdateSheet({ spellSlotUsed: next });
    if (typeof onUpdateCharacter === 'function') onUpdateCharacter((prev) => ({ ...prev, spellSlotsUsed: next }));
  }
  return true;
}

export function consumePactSlot(pactSlots, sheet, onUpdateSheet, onUpdateCharacter) {
  const level = Number(pactSlots?.level || 0);
  const total = Math.max(0, Number(pactSlots?.count || 0));
  if (!level || !total || getAvailablePactSlots(pactSlots, sheet) <= 0) return false;

  const next = { ...(sheet?.spellSlotUsed || {}) };
  const key = getPactSlotUsedKey(level);
  next[key] = Math.min(total, getPactSlotUsed(next, level) + 1);
  if (typeof onUpdateSheet === 'function') onUpdateSheet({ spellSlotUsed: next });
  if (typeof onUpdateCharacter === 'function') {
    onUpdateCharacter((prev) => ({ ...prev, spellSlotsUsed: next }));
  }
  return true;
}
