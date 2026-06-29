import { createContext, useCallback, useContext, useMemo, useReducer } from 'react';
import { rollDice } from '../logic/dice.js';
import { makeSavedEncounter } from '../logic/storage.js';
import { encounterReducer, createInitialState } from './reducer.js';
import { useEncounterPersistence } from '../hooks/useEncounterPersistence.js';
import { useMonsterDb } from '../hooks/useMonsterDb.js';
import { useCampaignPlayers } from '../hooks/useCampaignPlayers.js';

const EncounterBuilderContext = createContext(null);

export function EncounterBuilderProvider({ instanceId, instanceSaved, onInstanceSaved, children }) {
  const [state, dispatch] = useReducer(encounterReducer, undefined, createInitialState);
  const monsterDb = useMonsterDb();
  const campaignPlayers = useCampaignPlayers();
  const { saveInstance } = useEncounterPersistence({
    instanceId,
    instanceSaved,
    monsters: monsterDb.monsters,
    monsterStatus: monsterDb.status,
    state,
    dispatch,
    onSaved: onInstanceSaved,
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

  const roll = useCallback((notation, type) => {
    const result = rollDice(notation, type);
    if (!result) return null;
    dispatch({ type: 'addRoll', roll: result, actor: getRollActor() });
    return result;
  }, [getRollActor]);

  const saveEncounterToLibrary = useCallback((name) => {
    if (!state.encounter.length) return null;
    const entry = makeSavedEncounter(name, state.encounter, state.party);
    dispatch({ type: 'saveEncounterToLibrary', entry });
    return entry;
  }, [state.encounter, state.party]);

  const value = useMemo(() => ({
    state,
    dispatch,
    monsterDb,
    campaignPlayers,
    instanceId,
    instanceSaved,
    saveInstance,
    saveEncounterToLibrary,
    roll,
  }), [campaignPlayers, instanceId, instanceSaved, monsterDb, roll, saveEncounterToLibrary, saveInstance, state]);

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
