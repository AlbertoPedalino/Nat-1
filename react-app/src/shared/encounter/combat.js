import { COMBAT_LABEL_COLORS, COMBAT_LABEL_SHAPES, PLAYER_COLORS } from './combatLabels.js';
import { findMonster, getAC, getHP } from '../bestiary/monsterUtils.js';
import { abilityModifier } from '../character/progression/abilityModifier.js';
import { resolveCombatVitals } from './sheetSync.js';
import { normalizeConditions } from '../character/combat/conditions.js';
import { normalizeEffects } from '../character/combat/combatEffects.js';
import { clampInt, numberOr } from '../numbers.js';
import { restoreCombatantMortality } from './combatantVitals.js';
import { clampTempHp } from '../character/combat/vitals.js';
import {
  rollInitiative, initiativeKey, creatureInitiativeSources, resortKeepingTurn, sortCombatants,
} from './initiative.js';

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

// Who rolls initiative when an encounter launches, one row per creature in
// launch order — never "Goblin x3" — so the GM can give just one of them
// disadvantage (surprise) before the fight starts. `key` is what buildCombat
// reads the choice back by; `sources` is what the creature already has on its
// own (a player's synced conditions; monsters start clean).
export function initiativeRoster(encounter, players) {
  const labelFor = createLabeler();
  const rows = [];
  (Array.isArray(players) ? players : []).forEach((player, index) => {
    rows.push({
      key: initiativeKey('player', index),
      side: 'party',
      name: player.name || 'PC',
      sources: creatureInitiativeSources(player),
    });
  });
  const items = Array.isArray(encounter) ? encounter : [];
  const nameOf = (item) => item?.monsterData?.name || item?.name || 'Monster';
  const qtyOf = (item) => clampInt(item?.qty, 0, 99, 0);
  // The same letters the tracker will show; only needed where a name repeats.
  const totals = new Map();
  items.forEach((item) => totals.set(nameOf(item), (totals.get(nameOf(item)) || 0) + qtyOf(item)));
  items.forEach((item, itemIndex) => {
    const name = nameOf(item);
    for (let n = 0; n < qtyOf(item); n += 1) {
      const { label } = labelFor(name);
      rows.push({
        key: initiativeKey('monster', itemIndex, n),
        side: 'monsters',
        name: totals.get(name) > 1 ? `${name} ${label}` : name,
        sources: { adv: false, disadv: false },
      });
    }
  });
  return rows;
}

function createLabeler(existing = []) {
  const entries = new Map();
  let shapeIndex = 0;
  existing.forEach((combatant) => {
    if (!combatant?.shape || !combatant?.shapeClr) return;
    if (!entries.has(combatant.name)) {
      entries.set(combatant.name, {
        shape: combatant.shape,
        clr: combatant.shapeClr,
        count: 0,
      });
      shapeIndex += 1;
    }
    entries.get(combatant.name).count += 1;
  });

  return function assignLabel(name) {
    if (!entries.has(name)) {
      const idx = shapeIndex % COMBAT_LABEL_SHAPES.length;
      entries.set(name, { shape: COMBAT_LABEL_SHAPES[idx], clr: COMBAT_LABEL_COLORS[idx], count: 0 });
      shapeIndex += 1;
    }
    const entry = entries.get(name);
    const label = {
      label: LETTERS[entry.count % LETTERS.length],
      shape: entry.shape,
      shapeClr: entry.clr,
    };
    entry.count += 1;
    return label;
  };
}

// `initiative`: { [initiativeRoster key]: 'adv' | 'disadv' } chosen before the
// launch; anything absent rolls on the creature's own sources.
// A player's numbers as a fight allows them, from any source (a typed-in party
// row, a campaign sheet's summary, a launched combatant).
export function clampPlayerStats({ initMod, ac, hpMax }) {
  return {
    initMod: clampInt(initMod, -20, 30, 0),
    ac: clampInt(ac, 1, 99, 10),
    hpMax: clampInt(hpMax, 1, 999, 10),
  };
}

// A monster in a fight — from the bestiary (`monster`) or typed in by hand
// (`name`, `hpMax`, `ac`, `initMod`, `tempHP`) — at full hit points, with its
// letter-and-shape label from `assignLabel`.
function makeMonsterCombatant({
  id, monster = null, name = monster?.name, hpMax, ac, initMod, tempHP = 0, initiative, assignLabel,
}) {
  return {
    id,
    name,
    ...(monster ? { source: monster.source } : {}),
    type: 'monster',
    initiative,
    initMod,
    hpCurrent: hpMax,
    hpMax,
    tempHP,
    activeConditions: [],
    activeEffects: [],
    ac,
    deathSaves: { success: 0, fail: 0 },
    isDead: false,
    monsterData: monster,
    ...assignLabel(name),
  };
}

export function buildCombat(encounter, players, encounterId = null, rng = Math.random, { initiative = {} } = {}) {
  const assignLabel = createLabeler();
  let id = 0;
  const combatants = [];
  (Array.isArray(encounter) ? encounter : []).forEach((item, itemIndex) => {
    const monster = item.monsterData;
    if (!monster) return;
    const initMod = abilityModifier(monster.dex);
    for (let i = 0; i < clampInt(item.qty, 0, 99, 0); i += 1) {
      combatants.push(makeMonsterCombatant({
        id: id++,
        monster,
        hpMax: getHP(monster.hp),
        ac: getAC(monster.ac),
        initMod,
        initiative: rollInitiative(null, initMod, rng, initiative[initiativeKey('monster', itemIndex, i)]),
        assignLabel,
      }));
    }
  });
  (Array.isArray(players) ? players : []).forEach((player, index) => {
    const { initMod, ac, hpMax } = clampPlayerStats(player);
    const vitals = resolveCombatVitals(player, { ...player, hpMax });
    combatants.push({
      id: id++,
      name: player.name || 'PC',
      type: 'player',
      sourceId: player.sourceId || null,
      campaignId: player.campaignId || null,
      initiative: rollInitiative(player, initMod, rng, initiative[initiativeKey('player', index)]),
      initMod,
      ac,
      // Includes the player's reminders, a synced vital.
      ...vitals,
      monsterData: null,
      label: null,
      shape: null,
      shapeClr: null,
      color: player.color || player.iconColor || PLAYER_COLORS[index % PLAYER_COLORS.length],
      portraitPath: player.portraitPath || null,
    });
  });
  return {
    fightId: Date.now(),
    encounterId,
    combatants: sortCombatants(combatants),
    currentTurn: 0,
    round: 1,
  };
}

export function removeCombatant(combat, id) {
  const current = combat.combatants?.[combat.currentTurn || 0];
  const combatants = (combat.combatants || []).filter((combatant) => combatant.id !== id);
  let currentTurn = current ? combatants.findIndex((combatant) => combatant.id === current.id) : 0;
  if (currentTurn < 0) currentTurn = Math.min(combat.currentTurn || 0, Math.max(0, combatants.length - 1));
  return { ...combat, combatants, currentTurn };
}

// A creature joining a fight under way: placed by its initiative, the turn
// staying on whoever has it.
function joinFight(combat, fields, rng) {
  const next = makeMonsterCombatant({
    ...fields,
    id: nextCombatantId(combat.combatants),
    initiative: rollInitiative(null, fields.initMod, rng),
    assignLabel: createLabeler(combat.combatants || []),
  });
  return resortKeepingTurn(combat, [...(combat.combatants || []), next]);
}

export function addMonsterCombatant(combat, monster, rng = Math.random) {
  if (!monster) return combat;
  return joinFight(combat, {
    monster, hpMax: getHP(monster.hp), ac: getAC(monster.ac), initMod: abilityModifier(monster.dex),
  }, rng);
}

// Typed in by hand: the same limits as a player's numbers.
export function addManualCombatant(combat, payload, rng = Math.random) {
  const name = String(payload?.name || '').trim();
  if (!name) return combat;
  return joinFight(combat, {
    name, ...clampPlayerStats(payload), tempHP: clampTempHp(payload.tempHP),
  }, rng);
}

function nextCombatantId(combatants) {
  const ids = (Array.isArray(combatants) ? combatants : []).map((combatant) => Number(combatant.id)).filter(Number.isFinite);
  return ids.length ? Math.max(...ids) + 1 : 0;
}

export function autoFightName(combatants) {
  const names = [...new Set((combatants || []).map((combatant) => combatant.name))].slice(0, 3).join(', ');
  return names || 'Fight';
}

export function snapshotFight(combat) {
  return {
    combatants: (combat.combatants || []).map((combatant) => ({
      id: combatant.id,
      name: combatant.name,
      initiative: combatant.initiative,
      initMod: combatant.initMod || 0,
      sourceId: combatant.sourceId || null,
      campaignId: combatant.campaignId || null,
      // Every synced vital at once, from the registry. Listing them by hand is
      // what silently dropped conditions from every saved fight: the field was
      // declared, mapped and allowed through the database, and still vanished
      // here. A field added to SYNCED_VITALS is now persisted without touching
      // this function.
      ...resolveCombatVitals(combatant, combatant),
      // Already in the line above for everyone; repeated so a monster's list is
      // normalized on the way out even if the registry changes shape later.
      activeEffects: normalizeEffects(combatant.activeEffects),
      // Deliberately not taken from the line above: resolveCombatVitals infers
      // death from failed death saves, which is right for a player and wrong for
      // a monster — monsters die at 0 HP and have no death saves to fail.
      isDead: combatant.isDead,
      ac: combatant.ac,
      type: combatant.type,
      label: combatant.label,
      shape: combatant.shape,
      shapeClr: combatant.shapeClr,
      color: combatant.color || null,
      // The face travels with the colour, and for the same reason: a fight is
      // stored as this snapshot and restored from it, so a field missing here is
      // a field the GM loses the moment they save. Leaving it out is why every
      // resumed fight — and every room handed over by the battle map, which is a
      // snapshot from the first moment — showed the party as coloured initials.
      portraitPath: combatant.portraitPath || null,
      monsterRef: combatant.monsterData
        ? { name: combatant.monsterData.name, source: combatant.monsterData.source }
        : null,
    })),
    currentTurn: combat.currentTurn || 0,
    round: combat.round || 1,
    // The last "next turn" the database counted (20_scene_turns.sql). Sent back
    // with every save, so a save from before the battle map moved the turn is
    // known for what it is and cannot put the earlier turn back.
    turnRevision: combat.turnRevision || 0,
  };
}

// The bestiary entry a stored combatant names (fights keep only a reference).
export function combatantMonster(monsters, combatant) {
  return combatant?.monsterRef
    ? findMonster(Array.isArray(monsters) ? monsters : [], combatant.monsterRef, { strictSource: true })
    : null;
}

export function restoreFight(entry, monsters) {
  const db = Array.isArray(monsters) ? monsters : [];
  const fight = entry?.fight || entry;
  return {
    fightId: entry?.id || Date.now(),
    encounterId: entry?.encounterId || null,
    combatants: (fight?.combatants || []).map((combatant) => restoreCombatantMortality({
      ...combatant,
      tempHP: clampTempHp(combatant.tempHP),
      // Fights snapshotted before conditions existed have no list at all.
      activeConditions: normalizeConditions(combatant.activeConditions),
      activeEffects: normalizeEffects(combatant.activeEffects),
      monsterData: combatantMonster(db, combatant),
    })),
    currentTurn: fight?.currentTurn || 0,
    round: fight?.round || 1,
    turnRevision: fight?.turnRevision || 0,
  };
}

// The turn from the fight's database row, once the GM has moved it elsewhere
// (the battle map's next turn advances turnRevision). Taken by combatant rather
// than by index: an initiative edit here may have reordered the list since.
// Same combat back when the row has nothing newer, so its echo saves nothing.
export function absorbFightTurn(combat, fight) {
  const revision = Number(fight?.turnRevision) || 0;
  if (!combat || revision <= (Number(combat.turnRevision) || 0)) return combat;
  const stored = Array.isArray(fight?.combatants) ? fight.combatants : [];
  const storedTurn = Math.max(0, Math.round(numberOr(fight.currentTurn, 0)));
  const currentId = stored[storedTurn]?.id;
  const combatants = combat.combatants || [];
  const index = currentId == null ? -1 : combatants.findIndex((combatant) => String(combatant.id) === String(currentId));
  return {
    ...combat,
    currentTurn: index >= 0 ? index : Math.min(storedTurn, Math.max(0, combatants.length - 1)),
    round: Math.max(1, Math.round(numberOr(fight.round, 1))),
    turnRevision: revision,
  };
}
