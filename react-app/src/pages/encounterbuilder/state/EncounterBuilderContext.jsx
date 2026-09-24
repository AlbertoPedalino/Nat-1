import { createContext, useCallback, useContext, useMemo, useReducer, useRef } from 'react';
import { rollDice } from '../rolls/dice.js';
import { makeSavedEncounter } from './storage.js';
import { encounterReducer, createInitialState } from './reducer.js';
import { useEncounterPersistence } from './useEncounterPersistence.js';
import { useMonsterDb } from '../bestiary/useMonsterDb.js';
import { useCampaignPlayers } from '../campaign/useCampaignPlayers.js';
import { useCharacterVitalSync } from '../campaign/useCharacterVitalSync.js';
import { useCharacterVitalDispatch } from '../campaign/useCharacterVitalDispatch.js';
import { useExternalFightSync } from '../sync/useExternalFightSync.js';
import { useCloudFights } from '../sync/useCloudFights.js';
import { useMonsterVitalDispatch } from '../sync/useMonsterVitalDispatch.js';
import { useEncounterRolls } from '../rolls/useEncounterRolls.js';
import { encounterRollActor } from '../rolls/rollActor.js';

const EncounterBuilderContext = createContext(null);

export function EncounterBuilderProvider({ instanceId, instanceSaved, linkGroupId, onInstanceSaved, children }) {
  const [state, reduce] = useReducer(encounterReducer, undefined, createInitialState);
  // Enemy vitals go to their fight row; a linked player's to their sheet;
  // everything else straight to the reducer.
  const cloudFightsRef = useRef(null);
  const monsterVitals = useMonsterVitalDispatch({ state, reduce, cloudRef: cloudFightsRef });
  const dispatch = useCharacterVitalDispatch(state.combat, monsterVitals.dispatch);
  const characterIds = [...new Set([
    ...state.players.map((p) => p.sourceId),
    ...(state.combat?.combatants || []).filter((p) => p.type === 'player').map((p) => p.sourceId),
    ...state.fights.flatMap((f) => (f.combatants || []).filter((p) => p.type === 'player').map((p) => p.sourceId)),
  ].filter(Boolean))];
  useCharacterVitalSync({ characterIds, dispatch: reduce, activeFightId: state.activeFightId });
  const monsterDb = useMonsterDb();
  const campaignPlayers = useCampaignPlayers();
  const rollSync = useEncounterRolls({
    instanceId, players: state.players, campaigns: campaignPlayers.campaigns, dispatch,
  });
  const { shareRoll } = rollSync;
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

  // Fights have a row each, and the row is the record. The blob beside them —
  // party, library — is still pushed on a timer, which suits what only this page
  // edits; a fight is written by the battle map too, and a blob cannot hold
  // something two writers touch without one of them losing. Enemy vitals in
  // the row are the only authority for them: the battle map writes them there
  // and its pieces display a copy the database derives.
  const cloudFights = useCloudFights({
    instanceId,
    instanceSaved,
    fights: state.fights,
    library: state.library,
    activeFightId: state.activeFightId,
    dispatch,
    isVitalsBusy: monsterVitals.isBusy,
  });
  cloudFightsRef.current = cloudFights;

  // Dungeon rooms handed across by the battle map, and other tabs of this
  // instance, arrive through local storage. With a cloud fight that cache may
  // bring structure but never enemy vitals.
  useExternalFightSync({
    instanceId,
    instanceSaved,
    activeFightId: state.activeFightId,
    fights: state.fights,
    library: state.library,
    monsters: monsterDb.monsters,
    dispatch,
    cloudFights: cloudFights.canSync,
  });

  const getRollActor = useCallback(() => {
    return encounterRollActor({ selectedStatblock: state.selectedStatblock, combat: state.combat, instanceId });
  }, [state.combat, state.selectedStatblock, instanceId]);

  // `actorOverride` lets a caller force the attribution (pass `null` for a
  // generic GM roll with no actor). Omit it to default to the selected/current
  // combatant via getRollActor().
  const roll = useCallback((notation, type, actorOverride, note = '', { localOnly = false } = {}) => {
    const result = rollDice(notation, type);
    if (!result) return null;
    const identity = actorOverride !== undefined ? { actorName: actorOverride || 'GM' } : getRollActor();
    const actor = identity.actorName;
    const resolvedNote = typeof note === 'function' ? note(result) : note;
    const annotated = { ...result, ...identity, note: String(resolvedNote || '') };
    if (localOnly) dispatch({ type: 'addRoll', roll: annotated, actor });
    else shareRoll(annotated, actor);
    return { ...annotated, actor };
  }, [getRollActor, shareRoll]);

  const saveEncounterToLibrary = useCallback((name) => {
    if (!state.encounter.length) return null;
    const existing = state.library.find((entry) => entry.id === state.currentEncounterId);
    const entry = makeSavedEncounter(name, state.encounter, state.party, state.encounterQuest, existing);
    dispatch({ type: 'saveEncounterToLibrary', entry });
    return entry;
  }, [state.currentEncounterId, state.encounter, state.encounterQuest, state.library, state.party]);

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
  }), [campaignPlayers, rollSync, instanceId, instanceSaved, monsterDb, roll, saveEncounterToLibrary, saveInstance, state, dispatch]);

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
