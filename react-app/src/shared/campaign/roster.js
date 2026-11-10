// The battle map's roster of characters: entries built from character digests
// (characterDigest.js rosterEntryFromDigest, the one shape), overlaid onto the
// pieces that stand for them.

import { normalizeDeathSaves } from '../character/combat/vitals.js';

// A campaign's character row as the scene list counts it: who, nothing more.
// Vitals come from the digests once a scene is open, never from here.
export function toCampaignMember(row) {
  if (!row?.id) return null;
  return { characterId: row.id, name: row.data?.name || row.name || 'Character' };
}

export function toCampaignMembers(rows) {
  return (rows || []).map(toCampaignMember).filter(Boolean);
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
      maxHpBonus: entry.maxHpBonus || 0,
      conditions: entry.conditions || [],
      effects: entry.effects || [],
      portraitPath: entry.portraitPath || null,
      className: entry.className || null,
      deathSaves: normalizeDeathSaves(entry.deathSaves),
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
        effects: sheet.effects,
        portraitPath: sheet.portraitPath,
        className: sheet.className,
        deathSaves: sheet.deathSaves,
        fromSheet: true,
      };
    }
    return {
      ...token,
      // A character's face comes from their sheet too, so changing it on the
      // sheet changes the piece without anybody touching the map.
      portraitPath: sheet.portraitPath,
      className: sheet.className,
      deathSaves: sheet.deathSaves,
      hpCurrent: sheet.hpCurrent,
      hpMax: sheet.hpMax,
      tempHp: sheet.tempHp,
      maxHpBonus: sheet.maxHpBonus,
      // The sheet owns a character's conditions, exactly as it owns their hit
      // points: the map shows them and writes back, it does not keep a copy.
      conditions: sheet.conditions,
      // Advantage/disadvantage too: the piece shows the sheet's list and never
      // keeps one of its own.
      effects: sheet.effects,
      // Marks the piece as reading a sheet, which is what earns it the numbers
      // inside the bar; a monster shows the bar alone. Whether any bar appears
      // at all is the token's own `showHp`.
      fromSheet: true,
    };
  });
}

// Which roster entries already stand on the map, so the panel can offer the rest
// instead of letting the GM place a duplicate by accident.
export function placedCharacterIds(tokens) {
  return new Set((tokens || []).map((token) => token?.characterId).filter(Boolean));
}
