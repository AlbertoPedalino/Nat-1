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

// Spent slots live on the sheet (`spellSlotUsed`) and on the saved character
// (`spellSlotsUsed`); every change writes both.
export function persistUsedSlots(usedSlots, onUpdateSheet, onUpdateCharacter) {
  if (typeof onUpdateSheet === 'function') onUpdateSheet({ spellSlotUsed: usedSlots });
  if (typeof onUpdateCharacter === 'function') onUpdateCharacter((prev) => ({ ...prev, spellSlotsUsed: usedSlots }));
}

// One more temporary slot of `level` (Font of Magic, Wild Resurgence): lasts
// until a Long Rest and is spent before the regular ones (see consumeSlot).
export function addCreatedSlot(sheet, level, onUpdateSheet, onUpdateCharacter) {
  const next = { ...getCreatedSpellSlots(sheet) };
  const key = String(level);
  next[key] = Number(next[key] || 0) + 1;
  persistCreatedSlots(next, onUpdateSheet, onUpdateCharacter);
}

// Every regular spell-slot level with a slot left (created slots included), for
// features that let the player pick which slot to spend.
export function availableRegularSlotLevels(regularSlots, sheet) {
  const created = sheet?.createdSpellSlots || {};
  const levels = [];
  for (let level = 1; level <= regularSlots.length; level++) {
    if (!Number(regularSlots[level - 1] || 0)) continue;
    const available = getAvailableRegularSlots(regularSlots, sheet, level);
    if (available > 0) levels.push({ level, available, hasCreated: Number(created[level] || 0) > 0 });
  }
  return levels;
}

// Lowest regular spell-slot level with a slot left (created slots included), or
// 0 when none: features that take "a spell slot" of any level spend the cheapest.
export function lowestAvailableSlotLevel(regularSlots, sheet) {
  const used = sheet?.spellSlotUsed || {};
  const created = sheet?.createdSpellSlots || {};
  for (let lv = 1; lv <= regularSlots.length; lv++) {
    const total = Number(regularSlots[lv - 1] || 0);
    if (!total) continue;
    if (total - getRegularSlotUsed(used, lv) + Number(created[lv] || 0) > 0) return lv;
  }
  return 0;
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
    persistUsedSlots(next, onUpdateSheet, onUpdateCharacter);
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
  persistUsedSlots(next, onUpdateSheet, onUpdateCharacter);
  return true;
}
