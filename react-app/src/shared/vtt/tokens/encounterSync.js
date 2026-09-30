// Keeping an imported piece and its combatant in step.
//
// A piece imported from a fight carries a `sourceRef` to its combatant; an edit
// on the map becomes the combatant that fight should end up with, which
// fightVitals.js commits to the fight row (the one authority for enemy
// vitals). A character's piece takes nothing from here: its vitals, conditions
// and advantage/disadvantage effects belong to the sheet.
//
// Everything here is pure: the callers own the reads and the writes.

import { effectId, normalizeEffects } from '../../character/combat/combatEffects.js';
import {
  DEAD_CONDITION_KEY,
  normalizeConditions,
  setConditionActive,
} from '../../character/combat/conditions.js';

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

// Order and shape are normalized on both sides, so these compare meaning rather
// than JSON: a differently ordered list is not a change to write back.
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
