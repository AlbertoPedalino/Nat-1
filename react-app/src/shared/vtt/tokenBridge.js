// The encounter builder and the battle map, kept in step through the token row.
//
// This is the same trick the party's pieces already use, applied to creatures.
// A character's hit points sync because both tools read and write one row in
// `characters`: the database is the meeting point, so it works between two tabs,
// two windows and two devices, and it survives either side being closed.
//
// A monster has no sheet — its stat block has no per-creature state — but an
// imported piece has something just as good: its own row in `map_tokens`, and a
// `source_ref` of "<instance>:<fight>:<combatant>" saying which combatant it
// stands for. So the row is the meeting point for creatures too. The builder
// writes hit points into it and hears its changes over the same realtime feed
// the map already streams.
//
// The localStorage bridge stays where it is. It is what keeps a fight in step
// when there is no account and no network, and it is the only path that can
// carry a whole fight from the map into the builder. This one carries vitals,
// and carries them across machines.
//
// Everything here is pure: the callers own the socket and the writes.

import { effectId, normalizeEffects } from '../character/combatEffects.js';
import { normalizeConditions } from '../character/conditions.js';
import { makeSourceRef, parseSourceRef } from './encounterSync.js';

// Which combatants of a fight can have a piece on a map, and what that piece's
// reference would be. Players are left out on purpose: their pieces are placed
// from the roster, carry no reference, and already sync through the sheet.
export function monsterRefs(combat, instanceId) {
  if (!instanceId || !combat?.fightId) return [];
  const refs = [];
  for (const combatant of combat.combatants || []) {
    if (!combatant || combatant.type === 'player' || combatant.sourceId) continue;
    const ref = makeSourceRef(instanceId, combat.fightId, combatant.id);
    if (ref) refs.push({ ref, combatant });
  }
  return refs;
}

// What a combatant says its piece should be. Row column names, because this
// goes to the database rather than through the editor.
export function tokenPatchFromCombatant(combatant) {
  return {
    hp_current: numberOrNull(combatant?.hpCurrent),
    hp_max: numberOrNull(combatant?.hpMax),
    conditions: normalizeConditions(combatant?.activeConditions),
    effects: normalizeEffects(combatant?.activeEffects),
  };
}

// A realtime row, in the shape `fightWithTokenVitals` reads. Only the fields
// that travel: position, artwork and the rest are the map's business.
export function tokenFromRow(row) {
  const sourceRef = row?.source_ref || null;
  if (!sourceRef) return null;
  return {
    sourceRef,
    hpCurrent: numberOrNull(row.hp_current),
    hpMax: numberOrNull(row.hp_max),
    conditions: normalizeConditions(row.conditions),
    effects: normalizeEffects(row.effects),
  };
}

// Whether a row belongs to this fight at all. The builder listens to every token
// it is allowed to see — one subscription rather than one per creature — so this
// is what sorts its own pieces from the rest of the campaign's board.
export function rowBelongsToFight(row, instanceId, fightId) {
  const ref = parseSourceRef(row?.source_ref);
  return Boolean(ref && ref.instanceId === String(instanceId) && ref.fightId === String(fightId));
}

// One string for a set of vitals, so "has this changed" and "is this our own
// write coming back" are both a comparison rather than a deep walk.
export function vitalsSignature(value) {
  const source = value || {};
  const hpCurrent = source.hp_current === undefined ? source.hpCurrent : source.hp_current;
  const hpMax = source.hp_max === undefined ? source.hpMax : source.hp_max;
  const conditions = source.conditions === undefined ? source.activeConditions : source.conditions;
  const effects = source.effects === undefined ? source.activeEffects : source.effects;
  return [
    numberOrNull(hpCurrent),
    numberOrNull(hpMax),
    normalizeConditions(conditions).join('|'),
    normalizeEffects(effects).map((effect) => effectId(effect)).join('|'),
  ].join('/');
}

function numberOrNull(value) {
  if (value == null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed) : null;
}
