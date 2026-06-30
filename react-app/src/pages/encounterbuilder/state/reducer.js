import {
  addManualCombatant,
  addMonsterCombatant,
  applySheetVitals,
  buildCombat,
  modifyHp,
  nextTurn,
  prevTurn,
  removeCombatant,
  rerollInitiative,
  restoreFight,
  setDeathSave,
  setHp,
  setMaxHp,
  setInitiative,
  setTempHp,
  snapshotFight,
  autoFightName,
} from '../logic/combat.js';
import { addRollLogEntry } from '../logic/dice.js';
import { PLAYER_COLORS } from '../logic/constants.js';
import { makeSavedEncounter } from '../logic/storage.js';
import { clampInt, hydrateEncounterItems, monsterKey, toEncounterMonster } from '../logic/monsterUtils.js';
import { sheetVitalsToCombat } from '../logic/sheetSync.js';

export const DEFAULT_PARTY = Object.freeze({ count: 4, level: 5 });

export function createDefaultPlayers(count = DEFAULT_PARTY.count) {
  return Array.from({ length: count }, (_, index) => ({
    id: index,
    name: `Giocatore ${index + 1}`,
    initMod: [2, 1, 3, 0][index] ?? 0,
    ac: [15, 14, 16, 18][index] ?? 10,
    hpMax: [30, 25, 28, 35][index] ?? 30,
    color: PLAYER_COLORS[index % PLAYER_COLORS.length],
  }));
}

export function createInitialState() {
  return {
    view: 'builder',
    filters: { search: '', cr: '', type: '', sources: [] },
    quickFilters: { search: '', cr: '', type: '' },
    party: { ...DEFAULT_PARTY },
    players: createDefaultPlayers(),
    encounter: [],
    encounterName: '',
    currentEncounterId: null,
    library: [],
    fights: [],
    activeFightId: null,
    combat: null,
    rollLog: [],
    selectedStatblock: null,
    campaignNotice: '',
  };
}

export function encounterReducer(state, action) {
  switch (action.type) {
    case 'hydrateStorage':
      return hydrateState(state, action.payload, action.monsters);
    case 'setView':
      return { ...state, view: action.view, selectedStatblock: null };
    case 'setFilter':
      return { ...state, filters: { ...state.filters, [action.key]: action.value } };
    case 'toggleSource':
      return toggleSource(state, action.source);
    case 'setQuickFilter':
      return { ...state, quickFilters: { ...state.quickFilters, [action.key]: action.value } };
    case 'addMonster':
      return addMonster(state, action.monster);
    case 'changeMonsterQty':
      return changeMonsterQty(state, action.id, action.delta);
    case 'removeEncounterItem':
      return { ...state, encounter: state.encounter.filter((item) => item.id !== action.id), currentEncounterId: null };
    case 'setEncounterName':
      return { ...state, encounterName: action.value };
    case 'setPartyCount':
      return setPartyCount(state, action.value);
    case 'setPartyLevel':
      return { ...state, party: { ...state.party, level: clampInt(action.value, 1, 20, state.party.level) } };
    case 'updatePlayer':
      return updatePlayer(state, action.index, action.patch);
    case 'importCampaignPlayers':
      return importCampaignPlayers(state, action.players);
    case 'saveEncounterToLibrary':
      return {
        ...state,
        library: [action.entry, ...state.library],
        currentEncounterId: action.entry.id,
        encounterName: '',
      };
    case 'deleteLibraryEncounter':
      return deleteLibraryEncounter(state, action.id);
    case 'clearLibrary':
      return { ...state, library: [], fights: [], activeFightId: null, combat: null };
    case 'loadLibraryEncounter':
      return {
        ...state,
        view: 'builder',
        encounter: hydrateEncounterItems(action.entry?.encounter, action.monsters),
        currentEncounterId: action.entry?.id || null,
        encounterName: action.entry?.name || '',
      };
    case 'launchCurrentEncounter':
      return launchCombat(state, state.encounter, action.encounterId ?? state.currentEncounterId, state.encounterName);
    case 'launchLibraryEncounter':
      return launchCombat(state, hydrateEncounterItems(action.entry?.encounter, action.monsters), action.entry?.id || null, action.entry?.name);
    case 'resumeFight':
      return withCombat(state, restoreFight(action.entry, action.monsters), { view: 'combat' });
    case 'nextTurn':
      return state.combat ? withCombat(state, nextTurn(state.combat)) : state;
    case 'prevTurn':
      return state.combat ? withCombat(state, prevTurn(state.combat)) : state;
    case 'rerollInitiative':
      return state.combat ? withCombat(state, rerollInitiative(state.combat)) : state;
    case 'setInitiative':
      return state.combat ? withCombat(state, setInitiative(state.combat, action.id, action.value)) : state;
    case 'modifyHp':
      return state.combat ? withCombat(state, modifyHp(state.combat, action.id, action.delta)) : state;
    case 'setHp':
      return state.combat ? withCombat(state, setHp(state.combat, action.id, action.value)) : state;
    case 'setMaxHp':
      return state.combat ? withCombat(state, setMaxHp(state.combat, action.id, action.value)) : state;
    case 'setTempHp':
      return state.combat ? withCombat(state, setTempHp(state.combat, action.id, action.value)) : state;
    case 'setDeathSave':
      return state.combat ? withCombat(state, setDeathSave(state.combat, action.id, action.saveType, action.value)) : state;
    case 'syncCombatantVitals':
      return syncCombatantVitals(state, action.sourceId, action.vitals);
    case 'removeCombatant':
      return state.combat ? withCombat(state, removeCombatant(state.combat, action.id)) : state;
    case 'addMonsterCombatant':
      return state.combat ? withCombat(state, addMonsterCombatant(state.combat, action.monster)) : state;
    case 'addManualCombatant':
      return state.combat ? withCombat(state, addManualCombatant(state.combat, action.payload)) : state;
    case 'selectStatblock':
      return { ...state, selectedStatblock: action.payload };
    case 'closeStatblock':
      return { ...state, selectedStatblock: null };
    case 'addRoll':
      return { ...state, rollLog: addRollLogEntry(state.rollLog, action.roll, action.actor) };
    case 'clearRollLog':
      return { ...state, rollLog: [] };
    case 'deleteFight':
      return deleteFight(state, action.id);
    default:
      return state;
  }
}

function syncCombatantVitals(state, sourceId, vitals) {
  if (!state.combat) return state;
  const combat = applySheetVitals(state.combat, sourceId, vitals);
  return combat === state.combat ? state : withCombat(state, combat);
}

function hydrateState(state, payload, monsters) {
  const partyData = payload?.partyData;
  const draftData = payload?.draftData;
  const fightsData = payload?.fightsData || { activeFightId: null, items: [] };
  const activeFight = fightsData.activeFightId
    ? fightsData.items.find((fight) => fight.id === fightsData.activeFightId)
    : null;
  return {
    ...state,
    party: partyData?.party || state.party,
    players: Array.isArray(partyData?.players) && partyData.players.length ? partyData.players : state.players,
    encounter: draftData?.encounter || state.encounter,
    encounterName: draftData?.encounterName || '',
    currentEncounterId: draftData?.currentEncounterId || null,
    library: Array.isArray(payload?.library) ? payload.library : state.library,
    fights: fightsData.items,
    activeFightId: fightsData.activeFightId || null,
    combat: activeFight ? restoreFight(activeFight, monsters) : state.combat,
    view: activeFight ? 'combat' : state.view,
  };
}

function toggleSource(state, source) {
  const set = new Set(state.filters.sources);
  if (set.has(source)) set.delete(source);
  else set.add(source);
  return { ...state, filters: { ...state.filters, sources: [...set] } };
}

function addMonster(state, monster) {
  if (!monster) return state;
  const key = monsterKey(monster);
  const existing = state.encounter.find((item) => monsterKey(item.monsterData || item) === key);
  if (existing) {
    return {
      ...state,
      currentEncounterId: null,
      encounter: state.encounter.map((item) => (
        item.id === existing.id ? { ...item, qty: clampInt(item.qty + 1, 1, 99, 1) } : item
      )),
    };
  }
  return {
    ...state,
    currentEncounterId: null,
    encounter: [...state.encounter, toEncounterMonster(monster, `enc-${Date.now()}-${state.encounter.length}`)],
  };
}

function changeMonsterQty(state, id, delta) {
  const encounter = state.encounter
    .map((item) => (item.id === id ? { ...item, qty: item.qty + delta } : item))
    .filter((item) => item.qty > 0);
  return { ...state, encounter, currentEncounterId: null };
}

function setPartyCount(state, value) {
  const count = clampInt(value, 1, 10, state.party.count);
  let players = state.players.slice(0, count);
  while (players.length < count) {
    const index = players.length;
    players.push({
      id: index,
      name: `Giocatore ${index + 1}`,
      initMod: 0,
      ac: 10,
      hpMax: 30,
      color: PLAYER_COLORS[index % PLAYER_COLORS.length],
    });
  }
  return { ...state, party: { ...state.party, count }, players };
}

function updatePlayer(state, index, patch) {
  return {
    ...state,
    players: state.players.map((player, i) => (i === index ? normalizePlayer({ ...player, ...patch }, i) : player)),
  };
}

function importCampaignPlayers(state, campaignPlayers) {
  const incoming = Array.isArray(campaignPlayers) ? campaignPlayers : [];
  if (!incoming.length) return { ...state, campaignNotice: '' };
  let players = isDefaultPlaceholderParty(state.players) ? [] : [...state.players];
  let added = 0;
  let updated = 0;
  let skipped = 0;

  incoming.forEach((player) => {
    const next = normalizePlayer({
      id: `cloud:${player.sourceId}`,
      sourceId: player.sourceId,
      campaignId: player.campaignId,
      name: player.name,
      level: player.level,
      initMod: player.initMod,
      ac: player.ac,
      hpMax: player.hpMax,
      currentHP: player.currentHP,
      tempHP: player.tempHP,
      maxHPBonus: player.maxHPBonus,
      deathSaves: player.deathSaves,
      iconColor: player.iconColor,
      color: player.iconColor || PLAYER_COLORS[players.length % PLAYER_COLORS.length],
    }, players.length);
    const existingIndex = players.findIndex((item) => item.sourceId === next.sourceId);
    if (existingIndex >= 0) {
      players[existingIndex] = { ...players[existingIndex], ...next, color: next.iconColor || players[existingIndex].color || next.color };
      updated += 1;
      return;
    }
    if (players.length >= 10) {
      skipped += 1;
      return;
    }
    players.push(next);
    added += 1;
  });

  const level = campaignAverageLevel(incoming);
  const parts = [];
  if (added) parts.push(`${added} added`);
  if (updated) parts.push(`${updated} updated`);
  if (skipped) parts.push(`${skipped} skipped (party limit 10)`);
  return {
    ...state,
    players,
    party: { count: Math.max(1, Math.min(10, players.length)), level },
    campaignNotice: parts.length ? `${parts.join(', ')}.` : 'Campaign players already in party.',
  };
}

function normalizePlayer(player, index) {
  const hpMax = clampInt(player.hpMax, 1, 999, 10);
  const vitals = sheetVitalsToCombat({ ...player, hpMax });
  const normalized = {
    ...player,
    name: String(player.name || `Giocatore ${index + 1}`),
    initMod: clampInt(player.initMod, -20, 30, 0),
    ac: clampInt(player.ac, 1, 99, 10),
    hpMax,
    color: sanitizePlayerColor(player.color) || sanitizePlayerColor(player.iconColor) || PLAYER_COLORS[index % PLAYER_COLORS.length],
    iconColor: sanitizePlayerColor(player.iconColor) || null,
  };
  if (player.currentHP != null || player.hpCurrent != null) {
    normalized.currentHP = vitals.hpCurrent ?? hpMax;
  }
  if (player.tempHP != null) {
    normalized.tempHP = vitals.tempHP;
  }
  if (player.maxHPBonus != null) {
    normalized.maxHPBonus = vitals.maxHPBonus;
  }
  if (player.deathSaves != null) {
    normalized.deathSaves = { success: vitals.deathSaves.s, fail: vitals.deathSaves.f };
  }
  return normalized;
}

function sanitizePlayerColor(value) {
  const color = String(value || '').trim();
  return /^#[0-9a-f]{6}$/i.test(color) ? color.toLowerCase() : '';
}

function isDefaultPlaceholderParty(players) {
  if (!players.length) return true;
  return players.every((player, index) => (
    !player.sourceId
    && /^Giocatore \d+$/i.test(String(player.name || ''))
    && (player.id == null || Number(player.id) === index)
  ));
}

function campaignAverageLevel(players) {
  if (!players.length) return 1;
  const total = players.reduce((sum, player) => sum + clampInt(player.level, 1, 20, 1), 0);
  return clampInt(total / players.length, 1, 20, 1);
}

// Every launch is backed by a library encounter, so its card always exposes the
// full Load/Launch/Resume/Delete actions. An unsaved draft is snapshotted here.
function launchCombat(state, encounter, encounterId, name) {
  let library = state.library;
  let id = encounterId || null;
  if (id == null && encounter.length) {
    const entry = makeSavedEncounter(name, encounter, state.party);
    library = [entry, ...library];
    id = entry.id;
  }
  const combat = buildCombat(encounter, state.players, id);
  combat.name = library.find((entry) => entry.id === id)?.name || autoFightName(combat.combatants);
  return withCombat({
    ...state,
    library,
    encounter,
    currentEncounterId: id,
    encounterName: '',
  }, combat, { view: 'combat' });
}

function withCombat(state, combat, patch = {}) {
  const existing = (state.fights || []).find((fight) => fight.id === combat.fightId);
  const fightEntry = {
    id: combat.fightId,
    name: existing?.name || combat.name || autoFightName(combat.combatants),
    savedAt: Date.now(),
    encounterId: combat.encounterId || null,
    fight: snapshotFight(combat),
  };
  // Keep one fight per encounter: a fresh launch supersedes the previous fight.
  const fights = [fightEntry, ...state.fights.filter((fight) => (
    fight.id !== fightEntry.id
    && !(fightEntry.encounterId != null && fight.encounterId === fightEntry.encounterId)
  ))];
  return {
    ...state,
    ...patch,
    combat,
    fights,
    activeFightId: fightEntry.id,
  };
}

function deleteLibraryEncounter(state, id) {
  const fights = state.fights.filter((fight) => fight.encounterId !== id);
  const activeAlive = fights.some((fight) => fight.id === state.activeFightId);
  return {
    ...state,
    library: state.library.filter((entry) => entry.id !== id),
    fights,
    activeFightId: activeAlive ? state.activeFightId : null,
    combat: activeAlive ? state.combat : null,
    view: activeAlive ? state.view : 'builder',
  };
}

function deleteFight(state, id) {
  const fights = state.fights.filter((fight) => fight.id !== id);
  return {
    ...state,
    fights,
    activeFightId: state.activeFightId === id ? null : state.activeFightId,
    combat: state.activeFightId === id ? null : state.combat,
    view: state.activeFightId === id ? 'builder' : state.view,
  };
}
