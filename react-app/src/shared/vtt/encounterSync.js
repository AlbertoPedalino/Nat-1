// Keeping an imported piece and its combatant in step.
//
// The two live in different places on purpose: encounters are local-first blobs
// in the GM's browser, scenes are cloud rows. There is no server that can see
// both, so the only meeting point is a browser with both tabs open. That is what
// this module supports, and it is why the sync is best-effort rather than
// authoritative — close the encounter tab and the map simply stops hearing about
// hit points until it is opened again.
//
// Everything here is pure: the callers own the storage reads and the writes.

import { effectId, normalizeEffects } from '../character/combatEffects.js';
import {
  DEAD_CONDITION_KEY,
  normalizeConditions,
  setConditionActive,
} from '../character/conditions.js';

const SEPARATOR = ':';

export function makeSourceRef(instanceId, fightId, combatantId) {
  if (!instanceId || !fightId || combatantId == null) return null;
  // Ids come from our own storage, but a colon in one of them would silently
  // shift every field after it.
  const parts = [instanceId, fightId, combatantId].map((part) => String(part));
  return parts.some((part) => part.includes(SEPARATOR)) ? null : parts.join(SEPARATOR);
}

export function parseSourceRef(ref) {
  const parts = String(ref || '').split(SEPARATOR);
  if (parts.length !== 3 || parts.some((part) => !part)) return null;
  return { instanceId: parts[0], fightId: parts[1], combatantId: parts[2] };
}

function deathSavesOf(value) {
  const raw = value?.deathSaves || value || {};
  const clamp = (entry) => Math.max(0, Math.min(3, Math.round(Number(entry) || 0)));
  return { success: clamp(raw.success ?? raw.s), fail: clamp(raw.fail ?? raw.f) };
}

function vitalsOf(combatant) {
  const hpCurrent = Number.isFinite(Number(combatant?.hpCurrent)) ? Math.round(Number(combatant.hpCurrent)) : null;
  const player = combatant?.type === 'player' || Boolean(combatant?.sourceId);
  const deathSaves = player ? deathSavesOf(combatant) : null;
  const dead = player
    ? hpCurrent === 0 && (deathSaves.fail >= 3 || Boolean(combatant?.isDead)
      || normalizeConditions(combatant?.activeConditions).includes(DEAD_CONDITION_KEY))
    : hpCurrent === 0 || Boolean(combatant?.isDead);
  return {
    hpCurrent,
    hpMax: Number.isFinite(Number(combatant?.hpMax)) ? Math.round(Number(combatant.hpMax)) : null,
    // Conditions and effects travel too: marking a creature prone in one tool
    // and finding it upright in the other is exactly the kind of drift that
    // makes two views of a fight worse than one.
    conditions: setConditionActive(combatant?.activeConditions, DEAD_CONDITION_KEY, dead),
    effects: normalizeEffects(combatant?.activeEffects),
    ...(player ? { deathSaves: dead ? { ...deathSaves, fail: 3 } : deathSaves } : {}),
  };
}

// Order and shape are normalized on both sides, so this compares meaning rather
// than JSON: a differently ordered list is not a change to write back.
function sameState(vitals, token) {
  return vitals.hpCurrent === token.hpCurrent
    && vitals.hpMax === token.hpMax
    && conditionsKey(vitals.conditions) === conditionsKey(token.conditions)
    && effectsKey(vitals.effects) === effectsKey(token.effects)
    && deathSavesKey(vitals.deathSaves) === deathSavesKey(token.deathSaves);
}

function conditionsKey(list) {
  return normalizeConditions(list).join('|');
}

function effectsKey(list) {
  return normalizeEffects(list).map((effect) => effectId(effect)).join('|');
}

function deathSavesKey(value) {
  if (value == null) return '';
  const saves = deathSavesOf(value);
  return `${saves.success}|${saves.fail}`;
}

// Which combatant a piece stands for. Two ways in, because pieces arrive by two
// routes: a monster imported from this fight carries its reference, while a
// character's piece was placed from the party roster and is matched by the sheet
// it represents — the same `sourceId` the encounter builder uses to sync sheets.
export function matchCombatant(token, { instanceId, fightId, byRef, bySheet }) {
  const ref = parseSourceRef(token?.sourceRef);
  if (ref) {
    if (ref.instanceId !== instanceId || ref.fightId !== String(fightId)) return null;
    return byRef.get(ref.combatantId) || null;
  }
  return token?.characterId ? bySheet.get(token.characterId) || null : null;
}

// Encounter -> map. Which tokens of this scene disagree with the fight, and what
// they should become. Pieces from another fight, or standing for nobody in it,
// are left alone.
export function tokenUpdatesFromFight(tokens, { instanceId, fightId, combatants }) {
  const byRef = new Map((combatants || []).map((combatant) => [String(combatant?.id), combatant]));
  const bySheet = new Map(
    (combatants || []).filter((combatant) => combatant?.sourceId).map((c) => [c.sourceId, c]),
  );
  const updates = [];

  for (const token of tokens || []) {
    const combatant = matchCombatant(token, { instanceId, fightId, byRef, bySheet });
    if (!combatant) continue;
    const vitals = vitalsOf(combatant);
    // A character's hit points belong to their sheet, which the encounter
    // builder already syncs directly. Writing them onto the piece too would put
    // a second copy in play.
    if (token.characterId) {
      if (vitals.hpCurrent === token.hpCurrent
        && conditionsKey(vitals.conditions) === conditionsKey(token.conditions)
        && effectsKey(vitals.effects) === effectsKey(token.effects)
        && deathSavesKey(vitals.deathSaves) === deathSavesKey(token.deathSaves)) continue;
      updates.push({
        id: token.id,
        characterId: token.characterId,
        characterVitals: {
          currentHP: vitals.hpCurrent,
          deathSaves: vitals.deathSaves,
          activeConditions: vitals.conditions,
        },
        conditions: vitals.conditions,
        effects: vitals.effects,
        deathSaves: vitals.deathSaves,
      });
      continue;
    }
    if (sameState(vitals, token)) continue;
    updates.push({ id: token.id, ...vitals });
  }

  return updates;
}

// Map -> encounter. The combatants a fight should end up with once a token's
// hit points have been edited on the map. Returns null when nothing changed, so
// the caller can skip the write and the event it would emit.
export function fightWithTokenVitals(combatants, token) {
  const ref = parseSourceRef(token?.sourceRef);
  if (!ref && !token?.characterId) return null;

  let changed = false;
  const next = (combatants || []).map((combatant) => {
    const mine = ref
      ? String(combatant?.id) === ref.combatantId
      : combatant?.sourceId === token.characterId;
    if (!mine) return combatant;

    let conditions = normalizeConditions(token.conditions);
    const effects = normalizeEffects(token.effects);
    // Hit points are optional here: a piece can be marked prone without anyone
    // touching its health, and refusing the whole write in that case is what
    // would leave the two tools disagreeing.
    let hpCurrent = token.hpCurrent == null ? combatant.hpCurrent : Math.round(Number(token.hpCurrent));
    const hpMax = token.hpMax == null ? combatant.hpMax : Math.round(Number(token.hpMax));
    const player = combatant.type === 'player' || Boolean(combatant.sourceId);
    let deathSaves = player ? deathSavesOf(token.deathSaves ?? combatant.deathSaves) : combatant.deathSaves;
    const explicitlyDead = conditions.includes(DEAD_CONDITION_KEY);
    if (explicitlyDead) {
      hpCurrent = 0;
      if (player) deathSaves = { success: 0, fail: 3 };
    }
    if (hpCurrent > 0 && player) deathSaves = { success: 0, fail: 0 };
    const isDead = player
      ? hpCurrent === 0 && (explicitlyDead || deathSaves.fail >= 3)
      : hpCurrent <= 0;
    conditions = setConditionActive(conditions, DEAD_CONDITION_KEY, isDead);

    if (combatant.hpCurrent === hpCurrent
      && combatant.hpMax === hpMax
      && conditionsKey(combatant.activeConditions) === conditionsKey(conditions)
      && effectsKey(combatant.activeEffects) === effectsKey(effects)
      && deathSavesKey(player ? combatant.deathSaves : null) === deathSavesKey(player ? deathSaves : null)
      && Boolean(combatant.isDead) === isDead) {
      return combatant;
    }

    changed = true;
    return {
      ...combatant,
      hpCurrent,
      hpMax,
      activeConditions: conditions,
      activeEffects: effects,
      ...(player ? { deathSaves: { s: deathSaves.success, f: deathSaves.fail } } : {}),
      // isDead is the encounter builder's own flag and has to keep agreeing
      // with the hit points, or a creature killed on the map comes back alive
      // there.
      isDead,
    };
  });

  return changed ? next : null;
}

export function fightRefMatches(token, instanceId, fightId) {
  const ref = parseSourceRef(token?.sourceRef);
  return Boolean(ref && ref.instanceId === instanceId && ref.fightId === String(fightId));
}
