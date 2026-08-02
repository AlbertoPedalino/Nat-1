// Campaign character rows -> the little a map token needs to know about them.
// Deliberately thinner than the encounter builder's `toEncounterPlayer`: a
// piece on a map has no use for AC, HP or initiative, and pulling that mapper in
// would drag the class adapters into the VTT bundle for nothing.

import { normalizeConditions } from '../character/conditions.js';

const HEX_COLOR_RE = /^#[0-9a-f]{6}$/i;

export function normalizeIconColor(value) {
  const color = typeof value === 'string' ? value.trim() : '';
  return HEX_COLOR_RE.test(color) ? color.toLowerCase() : null;
}

export function toRosterEntry(row) {
  if (!row?.id) return null;
  const sheet = row.data || {};
  return {
    characterId: row.id,
    name: sheet.name || row.name || 'Character',
    ownerId: row.owner || null,
    ownerUsername: row.owner_username || null,
    color: normalizeIconColor(sheet.classIconColor),
    // The portrait belongs to the sheet, exactly as hit points and conditions
    // do: the piece on the map shows what the sheet says and never the reverse.
    portraitPath: typeof sheet.portraitPath === 'string' ? sheet.portraitPath : null,
    // Hit points are deliberately absent here. Current HP is stored on the
    // sheet but max HP is derived — from hit dice, Constitution and class
    // features — so reading `data.maxHP` yields undefined for almost every
    // character, and a bar with no maximum is no bar at all. They are filled in
    // by readCampaignVitals, which loads the adapters first.
    hpCurrent: null,
    hpMax: null,
    tempHp: 0,
    // Conditions ARE stored on the sheet — they are a synced vital, unlike max
    // HP which is derived — so they can be read straight from the blob.
    conditions: normalizeConditions(sheet.activeConditions),
  };
}

// Hit points for the pieces that stand for characters, keyed by character id.
export function rosterVitals(roster) {
  const vitals = new Map();
  for (const entry of roster || []) {
    if (!entry?.characterId) continue;
    vitals.set(entry.characterId, {
      hpCurrent: entry.hpCurrent,
      hpMax: entry.hpMax,
      tempHp: entry.tempHp || 0,
      conditions: entry.conditions || [],
      portraitPath: entry.portraitPath || null,
    });
  }
  return vitals;
}

// Overlay the sheet's hit points onto the pieces that represent characters. A
// monster keeps its own, because its stat block has no per-creature state.
export function withSheetVitals(tokens, roster) {
  const vitals = rosterVitals(roster);
  if (!vitals.size) return tokens || [];
  return (tokens || []).map((token) => {
    const sheet = token.characterId ? vitals.get(token.characterId) : null;
    if (!sheet) return token;
    // Conditions come from the sheet even when the hit points cannot be derived
    // yet: they are two independent reads, and gating one on the other left a
    // character looking unafflicted until the adapters had loaded.
    if (sheet.hpMax == null) {
      return {
        ...token,
        conditions: sheet.conditions,
        portraitPath: sheet.portraitPath,
        fromSheet: true,
      };
    }
    return {
      ...token,
      // A character's face comes from their sheet too, so changing it on the
      // sheet changes the piece without anybody touching the map.
      portraitPath: sheet.portraitPath,
      hpCurrent: sheet.hpCurrent,
      hpMax: sheet.hpMax,
      tempHp: sheet.tempHp,
      // The sheet owns a character's conditions, exactly as it owns their hit
      // points: the map shows them and writes back, it does not keep a copy.
      conditions: sheet.conditions,
      // Marks the piece as reading a sheet, which is what earns it the numbers
      // inside the bar; a monster shows the bar alone. Whether any bar appears
      // at all is the token's own `showHp`.
      fromSheet: true,
    };
  });
}

export function toRoster(rows) {
  return (rows || []).map(toRosterEntry).filter(Boolean);
}

// Which roster entries already stand on the map, so the panel can offer the rest
// instead of letting the GM place a duplicate by accident.
export function placedCharacterIds(tokens) {
  return new Set((tokens || []).map((token) => token?.characterId).filter(Boolean));
}
