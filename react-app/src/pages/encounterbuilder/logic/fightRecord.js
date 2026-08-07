// A fight, as a database row and back.
//
// Kept out of the cloud module for the same reason every other mapper in this
// app is: that module reaches for the Supabase client at import time, and a
// mapping this load-bearing has to be testable without one.
//
// The row is the record. Party and library are still one blob per instance,
// pushed on a timer, which suits what only the builder edits — but a fight is
// written by the battle map too, and a blob cannot hold something two writers
// touch without one of them losing.

export const FIGHT_COLUMNS = 'id, instance_id, name, encounter_id, encounter, fight, updated_at';

// The builder mints both ids with `Date.now()` — numbers — and half the code
// that finds a fight or its library card compares them with `===`. The column is
// text, so a row read back as a string would be a fight the reducer cannot
// match: it would fail to supersede its own previous entry, and a card would
// stop opening the fight beneath it. Digits go back to being a number, which is
// exactly the value that was written.
function sameShapeId(value) {
  if (value == null) return null;
  const text = String(value);
  return /^\d+$/.test(text) && Number.isSafeInteger(Number(text)) ? Number(text) : text;
}

// The shape the builder's own `fights` array holds, so what comes back from the
// database drops straight into the reducer with nothing to translate.
export function toFightEntry(row) {
  if (!row?.id || !row.fight) return null;
  return {
    id: sameShapeId(row.id),
    name: row.name || 'Fight',
    savedAt: Date.parse(row.updated_at) || 0,
    encounterId: sameShapeId(row.encounter_id),
    // The library card this fight belongs to. A fight is only reachable through
    // the card of the encounter it was launched from, and the library is still a
    // blob this device may never have been given — without it a room sent from
    // another screen arrives as a fight nothing can open.
    encounter: row.encounter && typeof row.encounter === 'object' ? row.encounter : null,
    fight: row.fight,
  };
}

export function toFightRow(instanceId, ownerId, entry, now = new Date()) {
  if (!instanceId || !ownerId || !entry?.id || !entry.fight) return null;
  return {
    // The builder's own fight id, so a piece's `source_ref` on the map keeps
    // pointing at the same record with nothing to translate.
    id: String(entry.id),
    instance_id: String(instanceId),
    owner: ownerId,
    name: entry.name || 'Fight',
    encounter_id: entry.encounterId == null ? null : String(entry.encounterId),
    encounter: entry.encounter && typeof entry.encounter === 'object' ? entry.encounter : null,
    fight: entry.fight,
    updated_at: now.toISOString(),
  };
}

// Name and snapshot together: renaming a fight is a change worth carrying, and
// the snapshot is what the map reads. The timestamp is deliberately out — it
// moves on every save and would make every fight look changed.
export function fightSignature(entry) {
  try {
    return JSON.stringify([entry?.name || '', entry?.encounterId ?? null, entry?.fight || null]);
  } catch (_) {
    return String(entry?.savedAt || '');
  }
}

// The library cards a set of rows carries that this device has not got. Both
// the first read and every realtime change go through this, so a fight is never
// added without the card that opens it.
export function missingLibraryCards(entries, library) {
  const known = new Set((library || []).map((entry) => String(entry?.id)));
  const cards = [];
  for (const entry of entries || []) {
    const card = entry?.encounter;
    if (!card?.id || known.has(String(card.id))) continue;
    known.add(String(card.id));
    cards.push(card);
  }
  return cards;
}
