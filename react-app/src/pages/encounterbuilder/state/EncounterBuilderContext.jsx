import { createContext, useCallback, useContext, useMemo, useReducer } from 'react';
import { rollDice } from '../logic/dice.js';
import { makeSavedEncounter } from '../logic/storage.js';
import { encounterReducer, createInitialState } from './reducer.js';
import { useEncounterPersistence } from '../hooks/useEncounterPersistence.js';
import { useMonsterDb } from '../hooks/useMonsterDb.js';
import { useCampaignPlayers } from '../hooks/useCampaignPlayers.js';
import { useFightSheetSync } from '../hooks/useFightSheetSync.js';
import { useSheetRealtime } from '../hooks/useSheetRealtime.js';
import { useExternalFightSync } from '../hooks/useExternalFightSync.js';
import { useMapTokenBridge } from '../hooks/useMapTokenBridge.js';
import { useCloudFights } from '../hooks/useCloudFights.js';
import { useEncounterRolls } from '../hooks/useEncounterRolls.js';

const EncounterBuilderContext = createContext(null);

export function EncounterBuilderProvider({ instanceId, instanceSaved, linkGroupId, onInstanceSaved, children }) {
  const [state, dispatch] = useReducer(encounterReducer, undefined, createInitialState);
  const monsterDb = useMonsterDb();
  const campaignPlayers = useCampaignPlayers();
  const rollSync = useEncounterRolls({
    instanceId, players: state.players, campaigns: campaignPlayers.campaigns, dispatch,
  });
  const { shareRoll } = rollSync;
  const sheetSync = useFightSheetSync(state.combat);
  useSheetRealtime({ view: state.view, combat: state.combat, dispatch, sheetSync });
  const { saveInstance } = useEncounterPersistence({
    instanceId,
    instanceSaved,
    linkGroupId,
    monsters: monsterDb.monsters,
    monsterStatus: monsterDb.status,
    state,
    dispatch,
    onSaved: onInstanceSaved,
  });

  // The battle map writes back into this instance's saved fights, and sends
  // whole ones over when a dungeon room is handed across. Without this the
  // builder read storage only at mount — so a condition set on a piece sat there
  // until a reload, and a room arriving into an open tab was deleted by the very
  // next save this one made.
  useExternalFightSync({
    instanceId,
    instanceSaved,
    activeFightId: state.activeFightId,
    fights: state.fights,
    library: state.library,
    monsters: monsterDb.monsters,
    dispatch,
  });

  // The creatures of this fight and their pieces on the battle map, through the
  // token row — the same arrangement the party already has through the sheet.
  // Unlike the bridge above it crosses devices, and does not need the map to be
  // open: a creature wounded here is wounded on the board whenever it is opened.
  useMapTokenBridge({ instanceId, combat: state.combat, dispatch });

  // Fights have a row each, and the row is the record. The blob beside them —
  // party, library — is still pushed on a timer, which suits what only this page
  // edits; a fight is written by the battle map too, and a blob cannot hold
  // something two writers touch without one of them losing.
  useCloudFights({
    instanceId,
    instanceSaved,
    fights: state.fights,
    library: state.library,
    activeFightId: state.activeFightId,
    dispatch,
  });

  const getRollActor = useCallback(() => {
    const selected = state.selectedStatblock;
    if (selected?.combatantId != null) {
      const combatant = state.combat?.combatants?.find((item) => item.id === selected.combatantId);
      if (combatant?.shape) return `${combatant.name} ${combatant.shape}${combatant.label}`;
      if (combatant) return combatant.name;
    }
    if (selected?.monster) return selected.monster.name;
    const current = state.combat?.combatants?.[state.combat?.currentTurn || 0];
    if (!current) return null;
    return current.shape ? `${current.name} ${current.shape}${current.label}` : current.name;
  }, [state.combat, state.selectedStatblock]);

  // `actorOverride` lets a caller force the attribution (pass `null` for a
  // generic GM roll with no actor). Omit it to default to the selected/current
  // combatant via getRollActor().
  const roll = useCallback((notation, type, actorOverride, note = '', { localOnly = false } = {}) => {
    const result = rollDice(notation, type);
    if (!result) return null;
    const actor = actorOverride !== undefined ? actorOverride : getRollActor();
    const resolvedNote = typeof note === 'function' ? note(result) : note;
    const annotated = { ...result, note: String(resolvedNote || '') };
    if (localOnly) dispatch({ type: 'addRoll', roll: annotated, actor });
    else shareRoll(annotated, actor);
    return { ...annotated, actor };
  }, [getRollActor, shareRoll]);

  const saveEncounterToLibrary = useCallback((name) => {
    if (!state.encounter.length) return null;
    const entry = makeSavedEncounter(name, state.encounter, state.party, state.encounterQuest);
    dispatch({ type: 'saveEncounterToLibrary', entry });
    return entry;
  }, [state.encounter, state.encounterQuest, state.party]);

  const value = useMemo(() => ({
    state,
    dispatch,
    monsterDb,
    campaignPlayers,
    rollSync,
    instanceId,
    instanceSaved,
    saveInstance,
    saveEncounterToLibrary,
    roll,
  }), [campaignPlayers, rollSync, instanceId, instanceSaved, monsterDb, roll, saveEncounterToLibrary, saveInstance, state]);

  return (
    <EncounterBuilderContext.Provider value={value}>
      {children}
    </EncounterBuilderContext.Provider>
  );
}

export function useEncounterBuilder() {
  const context = useContext(EncounterBuilderContext);
  if (!context) throw new Error('useEncounterBuilder must be used within EncounterBuilderProvider.');
  return context;
}
