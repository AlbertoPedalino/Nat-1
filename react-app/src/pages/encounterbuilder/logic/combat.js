import { COMBAT_LABEL_COLORS, COMBAT_LABEL_SHAPES, PLAYER_COLORS } from './constants.js';
import { abilityMod, clampInt, getAC, getHP, numberOr } from './monsterUtils.js';
import { resolveCombatVitals, combatVitalsMatch } from './sheetSync.js';
import {
  normalizeConditions,
  setConditionActive,
  toggleCondition as toggleConditionKey,
  DEAD_CONDITION_KEY,
  EXHAUSTION_KEY,
} from '../../../shared/character/conditions.js';
import {
  addCustomEffect,
  normalizeEffects,
  removeEffect,
  setEffectDuration,
  toggleEffect,
} from '../../../shared/character/combatEffects.js';

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export function d20(rng = Math.random) {
  return Math.floor(rng() * 20) + 1;
}

function clampTempHp(value) {
  return Math.max(0, Math.round(numberOr(value, 0)));
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

export function buildCombat(encounter, players, encounterId = null, rng = Math.random) {
  const assignLabel = createLabeler();
  let id = 0;
  const combatants = [];
  (Array.isArray(encounter) ? encounter : []).forEach((item) => {
    const monster = item.monsterData;
    if (!monster) return;
    const initMod = abilityMod(monster.dex || 10);
    const hp = getHP(monster.hp);
    const ac = getAC(monster.ac);
    for (let i = 0; i < clampInt(item.qty, 0, 99, 0); i += 1) {
      combatants.push({
        id: id++,
        name: monster.name,
        source: monster.source,
        type: 'monster',
        initiative: d20(rng) + initMod,
        initMod,
        ac,
        hpMax: hp,
        hpCurrent: hp,
        tempHP: 0,
        activeConditions: [],
        activeEffects: [],
        monsterData: monster,
        isDead: false,
        ...assignLabel(monster.name),
      });
    }
  });
  (Array.isArray(players) ? players : []).forEach((player, index) => {
    const initMod = clampInt(player.initMod, -20, 30, 0);
    const hpMax = clampInt(player.hpMax, 1, 999, 10);
    const vitals = resolveCombatVitals(player, { ...player, hpMax });
    combatants.push({
      id: id++,
      name: player.name || 'PC',
      type: 'player',
      sourceId: player.sourceId || null,
      campaignId: player.campaignId || null,
      initiative: d20(rng) + initMod,
      initMod,
      ac: clampInt(player.ac, 1, 99, 10),
      ...vitals,
      // Not part of `vitals`: effects are encounter-local and never sync to a
      // player's sheet, so they are not in the SYNCED_VITALS registry.
      activeEffects: [],
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

export function sortCombatants(combatants) {
  return [...(Array.isArray(combatants) ? combatants : [])].sort((a, b) => b.initiative - a.initiative);
}

export function rerollInitiative(combat, rng = Math.random) {
  return {
    ...combat,
    combatants: sortCombatants((combat.combatants || []).map((combatant) => ({
      ...combatant,
      initiative: d20(rng) + numberOr(combatant.initMod, 0),
    }))),
    currentTurn: 0,
  };
}

export function nextTurn(combat) {
  const combatants = combat.combatants || [];
  if (!combatants.length) return combat;
  let currentTurn = combat.currentTurn || 0;
  let round = combat.round || 1;
  let safety = 0;
  do {
    currentTurn = (currentTurn + 1) % combatants.length;
    if (currentTurn === 0) round += 1;
    safety += 1;
  } while (combatants[currentTurn]?.isDead && combatants.some((c) => !c.isDead) && safety < combatants.length);
  return { ...combat, currentTurn, round };
}

export function prevTurn(combat) {
  const combatants = combat.combatants || [];
  if (!combatants.length) return combat;
  let currentTurn = combat.currentTurn || 0;
  let round = combat.round || 1;
  let safety = 0;
  do {
    currentTurn = (currentTurn - 1 + combatants.length) % combatants.length;
    if (currentTurn === combatants.length - 1) round = Math.max(1, round - 1);
    safety += 1;
  } while (combatants[currentTurn]?.isDead && combatants.some((c) => !c.isDead) && safety < combatants.length);
  return { ...combat, currentTurn, round };
}

export function updateCombatant(combat, id, updater) {
  return {
    ...combat,
    combatants: (combat.combatants || []).map((combatant) => (
      combatant.id === id ? updater(combatant) : combatant
    )),
  };
}

export function setInitiative(combat, id, value) {
  const current = combat.combatants?.[combat.currentTurn || 0];
  const initiative = Math.round(numberOr(value, 0));
  const sorted = sortCombatants((combat.combatants || []).map((combatant) => (
    combatant.id === id ? { ...combatant, initiative } : combatant
  )));
  return {
    ...combat,
    combatants: sorted,
    currentTurn: current ? Math.max(0, sorted.findIndex((combatant) => combatant.id === current.id)) : 0,
  };
}

// Conditions are per-combatant; for a player linked to a sheet they ride the
// vitals sync, so a GM's call lands on the player's own sheet.
export function toggleCombatantCondition(combat, id, key) {
  if (key === EXHAUSTION_KEY) return combat; // graded, and its level is not ours to set
  if (key === DEAD_CONDITION_KEY) {
    return updateCombatant(combat, id, (combatant) => (
      normalizeConditions(combatant.activeConditions).includes(DEAD_CONDITION_KEY)
        ? reviveCombatant(combatant)
        : killCombatant(combatant)
    ));
  }
  return updateCombatant(combat, id, (combatant) => ({
    ...combatant,
    activeConditions: normalizeConditions(toggleConditionKey(combatant.activeConditions, key)),
  }));
}

// Clears what this surface can set. Exhaustion survives: the encounter never
// owns `exhaustionLevel`, so dropping the key here would leave a player's sheet
// with a level and no condition to show for it.
export function clearCombatantConditions(combat, id) {
  return updateCombatant(combat, id, (combatant) => {
    const active = normalizeConditions(combatant.activeConditions);
    const alive = active.includes(DEAD_CONDITION_KEY) ? reviveCombatant(combatant) : combatant;
    return {
      ...alive,
      activeConditions: active.filter((condition) => condition === EXHAUSTION_KEY),
    };
  });
}

// Ad-hoc effects ("disadvantage on its next attack"). Unlike conditions these
// stay in the encounter: they carry no meaning on a character sheet, so nothing
// here touches the vitals sync.
export function toggleCombatantEffect(combat, id, key) {
  return updateCombatant(combat, id, (combatant) => ({
    ...combatant,
    activeEffects: toggleEffect(combatant.activeEffects, key),
  }));
}

export function addCombatantEffect(combat, id, { text, polarity } = {}) {
  return updateCombatant(combat, id, (combatant) => ({
    ...combatant,
    activeEffects: addCustomEffect(combatant.activeEffects, text, polarity),
  }));
}

export function setCombatantEffectDuration(combat, id, effectId, duration) {
  return updateCombatant(combat, id, (combatant) => ({
    ...combatant,
    activeEffects: setEffectDuration(combatant.activeEffects, effectId, duration),
  }));
}

export function removeCombatantEffect(combat, id, effectId) {
  return updateCombatant(combat, id, (combatant) => ({
    ...combatant,
    activeEffects: removeEffect(combatant.activeEffects, effectId),
  }));
}

export function clearCombatantEffects(combat, id) {
  return updateCombatant(combat, id, (combatant) => (
    normalizeEffects(combatant.activeEffects).length ? { ...combatant, activeEffects: [] } : combatant
  ));
}

export function setDeathSave(combat, id, type, value) {
  if (!['s', 'f'].includes(type)) return combat;
  return updateCombatant(combat, id, (combatant) => {
    if (!combatant.deathSaves) return combatant;
    const nextValue = combatant.deathSaves[type] === value ? value - 1 : value;
    const deathSaves = { ...combatant.deathSaves, [type]: clampInt(nextValue, 0, 3, 0) };
    const isDead = deathSaves.f >= 3;
    return {
      ...combatant,
      hpCurrent: isDead ? 0 : combatant.hpCurrent,
      deathSaves,
      isDead,
      activeConditions: setConditionActive(combatant.activeConditions, DEAD_CONDITION_KEY, isDead),
    };
  });
}

export function modifyHp(combat, id, delta) {
  const amount = numberOr(delta, 0);
  return updateCombatant(combat, id, (combatant) => {
    if (amount >= 0) {
      // Healing goes straight to current HP; temporary HP is unaffected.
      return applyHp(combatant, numberOr(combatant.hpCurrent, 0) + amount);
    }
    // Damage depletes temporary HP first (D&D RAW), then current HP.
    const temp = clampTempHp(combatant.tempHP);
    const absorbed = Math.min(temp, -amount);
    const next = applyHp(combatant, numberOr(combatant.hpCurrent, 0) - (-amount - absorbed));
    return absorbed ? { ...next, tempHP: temp - absorbed } : next;
  });
}

export function setHp(combat, id, value) {
  return updateCombatant(combat, id, (combatant) => applyHp(combatant, numberOr(value, combatant.hpCurrent)));
}

export function setMaxHp(combat, id, value) {
  return updateCombatant(combat, id, (combatant) => {
    const hpMax = clampInt(value, 1, 999, combatant.hpMax);
    if (hpMax === combatant.hpMax) return combatant;
    // Lowering max can't leave current above it; raising max never auto-heals.
    const hpCurrent = Math.min(numberOr(combatant.hpCurrent, hpMax), hpMax);
    const next = applyHp({
      ...combatant,
      hpMax,
    }, hpCurrent);
    // Track the change as a maxHPBonus delta so base max (hpMax - maxHPBonus)
    // stays recoverable for the "Max+" control. Base max is constant, so
    // ΔmaxHP === ΔmaxHPBonus. For linked PCs this also drives outbound sync,
    // which writes maxHPBonus so the sheet re-derives the same max; for monsters
    // it's inert bookkeeping (they never sync).
    next.maxHPBonus = numberOr(combatant.maxHPBonus, 0) + (hpMax - numberOr(combatant.hpMax, hpMax));
    return next;
  });
}

export function setTempHp(combat, id, value) {
  return updateCombatant(combat, id, (combatant) => {
    const tempHP = clampTempHp(value);
    return tempHP === clampTempHp(combatant.tempHP) ? combatant : { ...combatant, tempHP };
  });
}

export function applySheetVitals(combat, sourceId, vitals) {
  const charId = String(sourceId || '');
  if (!combat || !charId) return combat;
  let changed = false;
  const combatants = (combat.combatants || []).map((combatant) => {
    if (combatant?.type !== 'player' || String(combatant.sourceId || '') !== charId) return combatant;
    const v = resolveCombatVitals(combatant, vitals || {});
    if (combatVitalsMatch(combatant, v)) return combatant;
    changed = true;
    return { ...combatant, ...v };
  });
  return changed ? { ...combat, combatants } : combat;
}

function applyHp(combatant, value) {
  const hpCurrent = Math.max(0, Math.min(numberOr(combatant.hpMax, 1), Math.round(value)));
  const isMonster = combatant.type === 'monster';
  const dead = isMonster
    ? hpCurrent === 0
    : hpCurrent === 0 && (
      Number(combatant.deathSaves?.f || 0) >= 3
      || normalizeConditions(combatant.activeConditions).includes(DEAD_CONDITION_KEY)
    );
  return {
    ...combatant,
    hpCurrent,
    isDead: dead,
    activeConditions: setConditionActive(combatant.activeConditions, DEAD_CONDITION_KEY, dead),
    deathSaves: hpCurrent > 0 && combatant.deathSaves ? { s: 0, f: 0 } : combatant.deathSaves,
  };
}

function killCombatant(combatant) {
  const player = combatant.type === 'player';
  return {
    ...combatant,
    hpCurrent: 0,
    isDead: true,
    activeConditions: setConditionActive(combatant.activeConditions, DEAD_CONDITION_KEY, true),
    deathSaves: player ? { s: 0, f: 3 } : combatant.deathSaves,
  };
}

function reviveCombatant(combatant) {
  const player = combatant.type === 'player';
  return {
    ...combatant,
    hpCurrent: 1,
    isDead: false,
    activeConditions: setConditionActive(combatant.activeConditions, DEAD_CONDITION_KEY, false),
    deathSaves: player ? { s: 0, f: 0 } : combatant.deathSaves,
  };
}

function restoreCombatantMortality(combatant) {
  const hpCurrent = Math.max(0, Math.min(
    numberOr(combatant.hpMax, 1),
    Math.round(numberOr(combatant.hpCurrent, combatant.hpMax)),
  ));
  const player = combatant.type === 'player';
  const dead = player
    ? hpCurrent === 0 && (
      Number(combatant.deathSaves?.f || 0) >= 3
      || normalizeConditions(combatant.activeConditions).includes(DEAD_CONDITION_KEY)
    )
    : hpCurrent === 0;
  return {
    ...combatant,
    hpCurrent,
    isDead: dead,
    activeConditions: setConditionActive(combatant.activeConditions, DEAD_CONDITION_KEY, dead),
    ...(dead && player ? { deathSaves: { ...combatant.deathSaves, f: 3 } } : {}),
  };
}

export function removeCombatant(combat, id) {
  const current = combat.combatants?.[combat.currentTurn || 0];
  const combatants = (combat.combatants || []).filter((combatant) => combatant.id !== id);
  let currentTurn = current ? combatants.findIndex((combatant) => combatant.id === current.id) : 0;
  if (currentTurn < 0) currentTurn = Math.min(combat.currentTurn || 0, Math.max(0, combatants.length - 1));
  return { ...combat, combatants, currentTurn };
}

export function addMonsterCombatant(combat, monster, rng = Math.random) {
  if (!monster) return combat;
  const current = combat.combatants?.[combat.currentTurn || 0];
  const assignLabel = createLabeler(combat.combatants || []);
  const initMod = abilityMod(monster.dex || 10);
  const hp = getHP(monster.hp);
  const next = {
    id: nextCombatantId(combat.combatants),
    name: monster.name,
    source: monster.source,
    type: 'monster',
    initiative: d20(rng) + initMod,
    initMod,
    hpCurrent: hp,
    hpMax: hp,
    tempHP: 0,
    activeConditions: [],
    activeEffects: [],
    ac: getAC(monster.ac),
    deathSaves: { s: 0, f: 0 },
    isDead: false,
    monsterData: monster,
    ...assignLabel(monster.name),
  };
  const combatants = sortCombatants([...(combat.combatants || []), next]);
  return {
    ...combat,
    combatants,
    currentTurn: current ? combatants.findIndex((combatant) => combatant.id === current.id) : 0,
  };
}

export function addManualCombatant(combat, payload, rng = Math.random) {
  const name = String(payload?.name || '').trim();
  if (!name) return combat;
  const current = combat.combatants?.[combat.currentTurn || 0];
  const assignLabel = createLabeler(combat.combatants || []);
  const initMod = clampInt(payload.initMod, -20, 30, 0);
  const hp = clampInt(payload.hpMax, 1, 999, 10);
  const next = {
    id: nextCombatantId(combat.combatants),
    name,
    type: 'monster',
    initiative: d20(rng) + initMod,
    initMod,
    hpCurrent: hp,
    hpMax: hp,
    tempHP: clampTempHp(payload.tempHP),
    activeConditions: [],
    activeEffects: [],
    ac: clampInt(payload.ac, 0, 99, 10),
    deathSaves: { s: 0, f: 0 },
    isDead: false,
    monsterData: null,
    ...assignLabel(name),
  };
  const combatants = sortCombatants([...(combat.combatants || []), next]);
  return {
    ...combat,
    combatants,
    currentTurn: current ? combatants.findIndex((combatant) => combatant.id === current.id) : 0,
  };
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
      // Listed by hand because effects are deliberately outside SYNCED_VITALS
      // (they never reach a sheet). Normalized on the way out so a fight saved
      // now restores clean even if the catalog loses an effect later.
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
      monsterRef: combatant.monsterData
        ? { name: combatant.monsterData.name, source: combatant.monsterData.source }
        : null,
    })),
    currentTurn: combat.currentTurn || 0,
    round: combat.round || 1,
  };
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
      monsterData: combatant.monsterRef
        ? db.find((monster) => monster.name === combatant.monsterRef.name && monster.source === combatant.monsterRef.source) || null
        : null,
    })),
    currentTurn: fight?.currentTurn || 0,
    round: fight?.round || 1,
  };
}
