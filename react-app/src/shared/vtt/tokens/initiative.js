// Initiative on the battle map (20_scene_turns.sql).
//
// The turn is the fight's: `currentTurn` and `round` inside its
// encounter_fights row. A scene shows one fight (`map_scene_turns`), and the
// database projects it onto the pieces as `turn_order` / `turn_active`, which
// players read through the token RLS they already have. So a player's (and
// the projector's) turn order is built from the pieces they can see, and a
// creature they cannot see is simply not in it. The GM reads the fight itself
// and sees every combatant, placed or not.
//
// Everything here is pure: the callers own the reads and the writes.

import { combatantLabel } from './encounterImport.js';
import { parseSourceRef } from './encounterSync.js';

function wholeNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.floor(number) : fallback;
}

export function toSceneTurns(row) {
  if (!row?.scene_id) return null;
  return {
    sceneId: row.scene_id,
    instanceId: row.instance_id || null,
    fightId: row.fight_id || null,
    round: row.round == null ? null : wholeNumber(row.round, null),
  };
}

// Whether a scene is showing a fight at all.
export function showsFight(turns) {
  return Boolean(turns?.instanceId && turns?.fightId);
}

// What commit_fight_turn compares before it moves anything.
export function turnBase(fight) {
  return {
    currentTurn: Math.max(0, wholeNumber(fight?.currentTurn, 0)),
    round: Math.max(1, wholeNumber(fight?.round, 1)),
    turnRevision: Math.max(0, wholeNumber(fight?.turnRevision, 0)),
  };
}

// The order as one viewer's pieces carry it. One entry per slot: a creature
// with two pieces is still one turn.
export function turnEntriesFromTokens(tokens) {
  const bySlot = new Map();
  for (const token of tokens || []) {
    const order = Number(token?.turnOrder);
    if (!Number.isInteger(order) || order < 1 || bySlot.has(order)) continue;
    bySlot.set(order, {
      key: `slot:${order}`,
      order,
      active: Boolean(token.turnActive),
      name: token.secretLabel || token.label || '',
      color: token.color || null,
      imageUrl: token.imageUrl || null,
      dead: (token.conditions || []).includes('dead'),
      tokenId: token.id,
      onBoard: true,
      hiddenFromPlayers: Boolean(token.hiddenFromPlayers || token.layer === 'gm'),
    });
  }
  return [...bySlot.values()].sort((a, b) => a.order - b.order);
}

function tokenForCombatant(tokens, combatant, { instanceId, fightId }) {
  if (combatant?.type === 'player') {
    if (!combatant.sourceId) return null;
    return tokens.find((token) => token.characterId === String(combatant.sourceId)) || null;
  }
  return tokens.find((token) => {
    const ref = parseSourceRef(token.sourceRef);
    return ref && ref.instanceId === String(instanceId) && ref.fightId === String(fightId)
      && ref.combatantId === String(combatant?.id);
  }) || null;
}

// The GM's order: every combatant of the shown fight, with the piece that
// stands for it when there is one. `hiddenFromPlayers` marks the turns the
// table does not see; `onBoard: false` the ones with no piece at all.
export function turnEntriesFromFight(fightRow, tokens, turns) {
  const fight = fightRow?.fight;
  const combatants = Array.isArray(fight?.combatants) ? fight.combatants : [];
  if (!combatants.length || !showsFight(turns)) return [];
  const { currentTurn } = turnBase(fight);
  const list = tokens || [];
  return combatants.map((combatant, index) => {
    const token = tokenForCombatant(list, combatant, turns);
    return {
      key: `combatant:${combatant?.id ?? index}`,
      combatantId: combatant?.id ?? null,
      player: combatant?.type === 'player',
      order: index + 1,
      active: index === currentTurn,
      name: token?.secretLabel || token?.label || combatantLabel(combatant),
      color: token?.color || combatant?.color || null,
      imageUrl: token?.imageUrl || null,
      dead: Boolean(combatant?.isDead),
      tokenId: token?.id || null,
      onBoard: Boolean(token),
      hiddenFromPlayers: !token || Boolean(token.hiddenFromPlayers || token.layer === 'gm'),
    };
  });
}

// The fights a GM can show on this scene: those its imported pieces came from,
// and only while the fight still exists. Pieces outlive their encounter — a
// deleted fight left them pointing at nothing, offered as a nameless "Fight".
// `fights` maps fight id -> its row (name, fight), as loaded.
export function sceneFightChoices(tokens, fights = {}) {
  const choices = new Map();
  for (const token of tokens || []) {
    const ref = parseSourceRef(token?.sourceRef);
    if (!ref) continue;
    const key = `${ref.instanceId}:${ref.fightId}`;
    if (choices.has(key)) continue;
    const row = fights[ref.fightId];
    // No row: deleted (or not loaded yet). A row of another instance under the
    // same id is not this fight either.
    if (!row || String(row.instance_id) !== ref.instanceId) continue;
    choices.set(key, {
      key,
      instanceId: ref.instanceId,
      fightId: ref.fightId,
      name: row?.name || 'Fight',
      updatedAt: Date.parse(row?.updated_at) || 0,
    });
  }
  return [...choices.values()].sort((a, b) => b.updatedAt - a.updatedAt);
}
