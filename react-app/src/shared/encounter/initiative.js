import { creatureRollSources } from '../character/combat/rollSources.js';
import { advArgFor, withExtraSource } from '../character/dice/advantage.js';
import { rollD20 } from '../character/dice/dice.js';
import { numberOr } from '../numbers.js';

// Initiative in a running fight: rolling it (a Dexterity check with the
// creature's own advantage sources), the order, and moving through turns.

// Initiative is a Dexterity check: a d20 test on the creature's own sources
// (its conditions), plus the GM's launch choice ('adv' | 'disadv') if any.
// Every initiative roll goes through here: launch, reroll, added creatures.
export function rollInitiative(creature, initMod, rng, choice = null) {
  const sources = creatureInitiativeSources(creature);
  const advantage = advArgFor(choice === 'adv' || choice === 'disadv' ? withExtraSource(sources, choice) : sources);
  return rollD20(0, { advantage, rng }).kept + initMod;
}

export function initiativeKey(kind, index, n = 0) {
  return kind === 'player' ? `player:${index}` : `monster:${index}:${n}`;
}

export function creatureInitiativeSources(creature) {
  const { adv, disadv } = creatureRollSources({ conditions: creature?.activeConditions }, 'check');
  return { adv, disadv };
}

export function sortCombatants(combatants) {
  return [...(Array.isArray(combatants) ? combatants : [])].sort((a, b) => b.initiative - a.initiative);
}

export function rerollInitiative(combat, rng = Math.random) {
  return {
    ...combat,
    combatants: sortCombatants((combat.combatants || []).map((combatant) => ({
      ...combatant,
      initiative: rollInitiative(combatant, numberOr(combatant.initMod, 0), rng),
    }))),
    currentTurn: 0,
  };
}

// Whose turn is passed over: a dead monster. A character keeps their turn
// dead or alive (user decision 2026-11-10): death is often not the end of
// them, and the GM moves on with one click. Must match fight_turn_step in
// supabase/27_turn_skips_dead_monsters.sql.
export function skipsTurn(combatant) {
  return Boolean(combatant?.isDead) && combatant.type !== 'player';
}

// One turn forward (+1) or back (-1), passing over dead monsters while anyone
// is left to act. Passing the top of the order starts the next round; going
// back past it returns to the previous one (never below round 1).
function stepTurn(combat, direction) {
  const combatants = combat.combatants || [];
  if (!combatants.length) return combat;
  const count = combatants.length;
  let currentTurn = combat.currentTurn || 0;
  let round = combat.round || 1;
  let safety = 0;
  do {
    currentTurn = (currentTurn + direction + count) % count;
    if (direction > 0 && currentTurn === 0) round += 1;
    if (direction < 0 && currentTurn === count - 1) round = Math.max(1, round - 1);
    safety += 1;
  } while (skipsTurn(combatants[currentTurn]) && combatants.some((c) => !skipsTurn(c)) && safety < count);
  return { ...combat, currentTurn, round };
}

export function nextTurn(combat) {
  return stepTurn(combat, 1);
}

export function prevTurn(combat) {
  return stepTurn(combat, -1);
}

// The fight with a new list of combatants, sorted by initiative, the turn
// still on whoever had it.
export function resortKeepingTurn(combat, combatants) {
  const current = combat.combatants?.[combat.currentTurn || 0];
  const sorted = sortCombatants(combatants);
  return {
    ...combat,
    combatants: sorted,
    currentTurn: current ? Math.max(0, sorted.findIndex((combatant) => combatant.id === current.id)) : 0,
  };
}

export function setInitiative(combat, id, value) {
  const initiative = Math.round(numberOr(value, 0));
  return resortKeepingTurn(combat, (combat.combatants || []).map((combatant) => (
    combatant.id === id ? { ...combatant, initiative } : combatant
  )));
}
