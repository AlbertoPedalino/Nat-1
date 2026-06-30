import { COMBAT_LABEL_COLORS, COMBAT_LABEL_SHAPES, PLAYER_COLORS } from './constants.js';
import { abilityMod, clampInt, getAC, getHP, numberOr } from './monsterUtils.js';
import { resolveCombatVitals, combatVitalsMatch } from './sheetSync.js';

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
      monsterData: null,
      label: null,
      shape: null,
      shapeClr: null,
      color: player.color || player.iconColor || PLAYER_COLORS[index % PLAYER_COLORS.length],
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

export function setDeathSave(combat, id, type, value) {
  if (!['s', 'f'].includes(type)) return combat;
  return updateCombatant(combat, id, (combatant) => {
    if (!combatant.deathSaves) return combatant;
    const nextValue = combatant.deathSaves[type] === value ? value - 1 : value;
    const deathSaves = { ...combatant.deathSaves, [type]: clampInt(nextValue, 0, 3, 0) };
    return { ...combatant, deathSaves, isDead: deathSaves.f >= 3 };
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
    const isMonster = combatant.type === 'monster';
    const next = {
      ...combatant,
      hpMax,
      hpCurrent,
      isDead: isMonster ? hpCurrent === 0 : combatant.isDead && hpCurrent === 0,
    };
    // Linked PC: max HP is sheet-derived, so persist the change as a maxHPBonus
    // delta (base max is constant, so ΔmaxHP === ΔmaxHPBonus). Outbound sync then
    // writes maxHPBonus and the sheet re-derives the same max.
    if (combatant.type === 'player' && combatant.sourceId) {
      next.maxHPBonus = numberOr(combatant.maxHPBonus, 0) + (hpMax - numberOr(combatant.hpMax, hpMax));
    }
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
  return {
    ...combatant,
    hpCurrent,
    isDead: isMonster ? hpCurrent === 0 : combatant.isDead && hpCurrent === 0,
    deathSaves: hpCurrent > 0 && combatant.deathSaves ? { s: 0, f: 0 } : combatant.deathSaves,
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
      hpCurrent: combatant.hpCurrent,
      hpMax: combatant.hpMax,
      maxHPBonus: combatant.maxHPBonus ?? null,
      tempHP: clampTempHp(combatant.tempHP),
      ac: combatant.ac,
      type: combatant.type,
      deathSaves: combatant.deathSaves,
      isDead: combatant.isDead,
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
    combatants: (fight?.combatants || []).map((combatant) => ({
      ...combatant,
      tempHP: clampTempHp(combatant.tempHP),
      monsterData: combatant.monsterRef
        ? db.find((monster) => monster.name === combatant.monsterRef.name && monster.source === combatant.monsterRef.source) || null
        : null,
    })),
    currentTurn: fight?.currentTurn || 0,
    round: fight?.round || 1,
  };
}
