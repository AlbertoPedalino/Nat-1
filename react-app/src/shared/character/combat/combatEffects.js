// Reminders on a creature: what it has going right now — "Bardic Inspiration",
// "Guidance", "Bless", "+2 AC from cover". Free text, because no table can
// enumerate them, shown by name wherever the creature is (above its battle-map
// piece, on the sheet, on its encounter combatant). Dependency-free for the
// same reason conditions.js is — it must stay importable by the plain node
// test runner.
//
// A reminder changes no roll. Advantage and disadvantage are chosen on the roll
// itself (RollModeArea: right-click / long press on any d20 roller), so nothing
// here is read by the dice.
//
// The list is the `activeEffects` vital: on a player character it is in
// SYNCED_VITALS and in the health allowlist of supabase/13_character_vitals.sql,
// so sheet, piece and combatant show one list; a monster's stays on its
// combatant / fight. Entries are `{ key: 'custom', text }`. The list once also
// held advantage/disadvantage calls (other keys, a duration, a polarity): those
// entries are dropped when read, and the extra fields with them.
//
// Nothing expires: a reminder stays until someone removes it.

export const CUSTOM_EFFECT_KEY = 'custom';

// A creature's row has to stay scannable, and a reminder has to fit a pill.
// Both caps are UI budgets, exported so the input that enforces them and the
// normalizer that re-enforces them cannot disagree, and applied here so a
// hand-edited snapshot cannot smuggle a thousand entries back in.
export const MAX_EFFECTS = 12;
export const MAX_EFFECT_TEXT = 60;

// Identity is derived, never stored: a reminder is its text, so two identical
// ones are the same one. That keeps snapshots stable and removes any need to
// mint ids that would have to survive a save/restore round-trip.
export function effectId(effect) {
  return String(effect?.text || '');
}

function coerceEffect(raw) {
  if (!raw || typeof raw !== 'object' || raw.key !== CUSTOM_EFFECT_KEY) return null;
  const text = String(raw.text || '').trim().slice(0, MAX_EFFECT_TEXT);
  return text ? { key: CUSTOM_EFFECT_KEY, text } : null;
}

// Drop anything that is not a reminder, blank text and duplicates, and cap the
// list. Insertion order is kept — unlike conditions, which sort: the order the
// reminders were given in is the order they are read back in.
export function normalizeEffects(value) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  const out = [];
  for (const raw of value) {
    const effect = coerceEffect(raw);
    if (!effect) continue;
    const id = effectId(effect);
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(effect);
    if (out.length >= MAX_EFFECTS) break;
  }
  return out;
}

export function addReminder(effects, text) {
  return normalizeEffects([...normalizeEffects(effects), { key: CUSTOM_EFFECT_KEY, text }]);
}

export function removeEffect(effects, id) {
  return normalizeEffects(effects).filter((effect) => effectId(effect) !== id);
}
