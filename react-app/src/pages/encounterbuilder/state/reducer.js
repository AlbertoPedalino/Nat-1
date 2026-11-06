import {
  addCombatantEffect,
  addManualCombatant,
  addMonsterCombatant,
  applySheetVitals,
  clearCombatantConditions,
  clearCombatantEffects,
  modifyHp,
  nextTurn,
  prevTurn,
  removeCombatant,
  removeCombatantEffect,
  rerollInitiative,
  restoreFight,
  setDeathSave,
  setHp,
  setMaxHp,
  setInitiative,
  setTempHp,
  toggleCombatantCondition,
} from '../../../shared/encounter/combat.js';
import { addRollLogEntry } from '../rolls/dice.js';
import {
  createDefaultFumbleCategory,
  createDefaultFumbleTables,
  normalizeFumbleDice,
  normalizeFumbleTables,
} from '../rolls/fumbles.js';
import {
  createDefaultNegotiation,
  normalizeNegotiation,
  normalizeNegotiationThreshold,
  resolveNegotiation,
} from '../negotiation/negotiation.js';
import {
  hydrateEncounterItems, monsterKey, toEncounterMonster,
} from '../../../shared/bestiary/monsterUtils.js';
import { absorbMonsterVitals } from '../../../shared/vtt/tokens/fightVitals.js';
import { dedupeFightsByEncounter, dedupeLibraryById } from '../../../shared/encounter/library.js';
import { clampInt } from '../../../shared/numbers.js';
import {
  DEFAULT_PARTY, createDefaultPlayers, setPartyCount, updatePlayer, removePlayer, importCampaignPlayers,
} from './partyState.js';
import {
  launchCombat, withCombat, closeCombat, syncCombatantVitals, absorbFightVitals, absorbActiveFightTurn,
} from './combatState.js';
import { absorbExternal, deleteLibraryEncounter, assignEncounterQuest, deleteFight } from './libraryState.js';

export function createInitialState() {
  return {
    view: 'builder',
    filters: { search: '', cr: '', type: '', sources: [] },
    quickFilters: { search: '', cr: '', type: '' },
    party: { ...DEFAULT_PARTY },
    players: createDefaultPlayers(),
    encounter: [],
    encounterName: '',
    encounterQuest: null,
    currentEncounterId: null,
    library: [],
    fights: [],
    activeFightId: null,
    combat: null,
    rollLog: [],
    fumbleTables: createDefaultFumbleTables(),
    negotiation: createDefaultNegotiation(),
    selectedStatblock: null,
    campaignNotice: '',
  };
}

export function encounterReducer(state, action) {
  let next = reduceEncounterState(state, action);
  if (next === state) return state;
  for (const [id, vitals] of Object.entries(next.characterVitals || {})) {
    next = syncCombatantVitals(next, id, vitals);
  }
  return next;
}

function reduceEncounterState(state, action) {
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
      return { ...state, encounter: state.encounter.filter((item) => item.id !== action.id) };
    case 'newEncounter':
      return {
        ...state,
        view: 'builder',
        encounter: [],
        encounterName: '',
        encounterQuest: null,
        currentEncounterId: null,
        selectedStatblock: null,
      };
    case 'setEncounterName':
      return { ...state, encounterName: action.value };
    case 'setEncounterQuest':
      return { ...state, encounterQuest: String(action.quest || '') };
    case 'setPartyCount':
      return setPartyCount(state, action.value);
    case 'setPartyLevel':
      return { ...state, party: { ...state.party, level: clampInt(action.value, 1, 20, state.party.level) } };
    case 'updatePlayer':
      return updatePlayer(state, action.index, action.patch);
    case 'removePlayer':
      return removePlayer(state, action.index);
    case 'importCampaignPlayers':
      return importCampaignPlayers(state, action.players);
    case 'saveEncounterToLibrary':
      return {
        ...state,
        library: [action.entry, ...state.library.filter((entry) => entry.id !== action.entry.id)],
        // Saving over an encounter is the GM choosing that version: a fight of the
        // old one is superseded and goes, row and all (useCloudFights deletes what
        // leaves this list). The fight being run is left to finish.
        fights: state.fights.filter((fight) => (
          fight.encounterId !== action.entry.id || fight.id === state.activeFightId
        )),
        currentEncounterId: action.entry.id,
        encounterName: action.entry.name,
        encounterQuest: action.entry.quest || null,
      };
    case 'assignEncounterQuest':
      return assignEncounterQuest(state, action.id, action.quest);
    case 'deleteLibraryEncounter':
      return deleteLibraryEncounter(state, action.id);
    case 'clearLibrary':
      return { ...state, library: [], fights: [], currentEncounterId: null, activeFightId: null, combat: null };
    case 'loadLibraryEncounter':
      return {
        ...state,
        view: 'builder',
        encounter: hydrateEncounterItems(action.entry?.encounter, action.monsters),
        currentEncounterId: action.entry?.id || null,
        encounterName: action.entry?.name || '',
        encounterQuest: action.entry?.quest || null,
      };
    case 'launchCurrentEncounter':
      return launchCombat(
        state,
        state.encounter,
        null,
        state.encounterName,
        state.encounterQuest,
        action.initiative,
      );
    case 'launchLibraryEncounter':
      return launchCombat(
        state,
        hydrateEncounterItems(action.entry?.encounter, action.monsters),
        action.entry?.id || null,
        action.entry?.name,
        action.entry?.quest,
        action.initiative,
      );
    case 'resumeFight':
      return withCombat(state, restoreFight(action.entry, action.monsters), { view: 'combat' });
    case 'syncExternalFight': {
      if (!state.combat || String(action.entry?.id) !== String(state.activeFightId)) return state;
      let combat = restoreFight(action.entry, action.monsters);
      // Saved fights own monster vitals and encounter effects. A linked player's
      // vitals come from the sheet: replaying a cached fight must never publish
      // its old HP over the character's confirmed state.
      for (const player of state.combat.combatants) {
        if (player.type === 'player' && player.sourceId) {
          combat = applySheetVitals(combat, player.sourceId, player);
        }
      }
      // With a cloud fight, enemy vitals come only from its row: a local
      // cache (another tab, an old map push) must never replay them.
      if (action.preserveMonsterVitals) combat = absorbMonsterVitals(combat, state.combat);
      return withCombat(state, combat);
    }
    case 'closeCombat':
      return closeCombat(state);
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
    case 'modifyTempHp': {
      const c = state.combat?.combatants.find((item) => item.id === action.id);
      return c ? withCombat(state, setTempHp(state.combat, action.id, (Number(c.tempHP) || 0) + action.delta)) : state;
    }
    case 'modifyMaxHp': {
      const c = state.combat?.combatants.find((item) => item.id === action.id);
      return c ? withCombat(state, setMaxHp(state.combat, action.id, c.hpMax + action.delta)) : state;
    }
    case 'setMaxHpBonus': {
      const c = state.combat?.combatants.find((item) => item.id === action.id);
      return c ? withCombat(state, setMaxHp(state.combat, action.id, c.hpMax - (c.maxHPBonus || 0) + action.value)) : state;
    }
    case 'setDeathSave':
      return state.combat ? withCombat(state, setDeathSave(state.combat, action.id, action.saveType, action.value)) : state;
    case 'toggleCombatantCondition':
      return state.combat ? withCombat(state, toggleCombatantCondition(state.combat, action.id, action.key)) : state;
    case 'clearCombatantConditions':
      return state.combat ? withCombat(state, clearCombatantConditions(state.combat, action.id)) : state;
    case 'addCombatantEffect':
      return state.combat ? withCombat(state, addCombatantEffect(state.combat, action.id, action.payload)) : state;
    case 'removeCombatantEffect':
      return state.combat ? withCombat(state, removeCombatantEffect(state.combat, action.id, action.effectId)) : state;
    case 'clearCombatantEffects':
      return state.combat ? withCombat(state, clearCombatantEffects(state.combat, action.id)) : state;
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
    case 'setFumbleDice':
      return updateFumbleCategory(state, action.categoryId, (category) => ({
        ...category,
        dice: normalizeFumbleDice(action.dice),
      }));
    case 'setFumbleEntry':
      return updateFumbleCategory(state, action.categoryId, (category) => ({
        ...category,
        entries: {
          ...category.entries,
          [String(action.result)]: String(action.value ?? ''),
        },
      }));
    case 'resetFumbleCategory':
      return {
        ...state,
        fumbleTables: {
          ...state.fumbleTables,
          [action.categoryId]: createDefaultFumbleCategory(action.categoryId),
        },
      };
    case 'setNegotiationAttitude':
      return {
        ...state,
        negotiation: createDefaultNegotiation(action.attitude, state.negotiation?.threshold),
      };
    case 'setNegotiationThreshold':
      return {
        ...state,
        negotiation: {
          ...state.negotiation,
          threshold: normalizeNegotiationThreshold(action.value),
        },
      };
    case 'resolveNegotiation':
      return {
        ...state,
        negotiation: resolveNegotiation(state.negotiation, action.outcome),
      };
    case 'resetNegotiation':
      return {
        ...state,
        negotiation: createDefaultNegotiation(
          state.negotiation?.attitude,
          state.negotiation?.threshold,
        ),
      };
    case 'deleteFight':
      return deleteFight(state, action.id);
    case 'absorbExternal':
      return absorbExternal(state, action);
    case 'absorbFightVitals':
      return absorbFightVitals(state, action.fightId, action.fight);
    case 'absorbFightTurn':
      return absorbActiveFightTurn(state, action.fightId, action.fight);
    default:
      return state;
  }
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
    encounterQuest: draftData?.encounterQuest || null,
    currentEncounterId: draftData?.currentEncounterId || null,
    library: dedupeLibraryById(Array.isArray(payload?.library) ? payload.library : state.library),
    // Storage may already hold the duplicates written before they were merged
    // on the way in, so they are collapsed here too rather than being read back
    // for the rest of the instance's life.
    fights: dedupeFightsByEncounter(fightsData.items, fightsData.activeFightId),
    activeFightId: fightsData.activeFightId || null,
    combat: activeFight ? restoreFight(activeFight, monsters) : state.combat,
    view: activeFight ? 'combat' : state.view,
    fumbleTables: normalizeFumbleTables(payload?.fumbleTables),
    negotiation: normalizeNegotiation(payload?.negotiation),
  };
}

function updateFumbleCategory(state, categoryId, updater) {
  const current = state.fumbleTables?.[categoryId];
  if (!current) return state;
  return {
    ...state,
    fumbleTables: {
      ...state.fumbleTables,
      [categoryId]: updater(current),
    },
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
      encounter: state.encounter.map((item) => (
        item.id === existing.id ? { ...item, qty: clampInt(item.qty + 1, 1, 99, 1) } : item
      )),
    };
  }
  return {
    ...state,
    encounter: [...state.encounter, toEncounterMonster(monster, `enc-${Date.now()}-${state.encounter.length}`)],
  };
}

function changeMonsterQty(state, id, delta) {
  const encounter = state.encounter
    .map((item) => (item.id === id ? { ...item, qty: item.qty + delta } : item))
    .filter((item) => item.qty > 0);
  return { ...state, encounter };
}

