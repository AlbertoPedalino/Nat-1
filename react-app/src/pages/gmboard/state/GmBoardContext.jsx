import { createContext, useCallback, useContext, useMemo, useReducer } from 'react';
import { gmBoardReducer, createInitialState } from './reducer.js';
import { useGmBoardPersistence } from '../hooks/useGmBoardPersistence.js';
import { resolveProceed, resolveAdvanceOnly, resolveManualAdvance } from '../logic/hex.js';
import { createDungeon, isValidRoomCount } from '../logic/dungeon.js';
import { createQuests } from '../logic/quest.js';

const GmBoardContext = createContext(null);

export function GmBoardProvider({ instanceId, instanceSaved, linkGroupId, onInstanceSaved, children }) {
  const [state, dispatch] = useReducer(gmBoardReducer, undefined, createInitialState);
  const { saveInstance, saveTables, resetTables } = useGmBoardPersistence({
    instanceId,
    instanceSaved,
    linkGroupId,
    state,
    dispatch,
    onSaved: onInstanceSaved,
  });

  const proceed = useCallback(() => {
    const result = resolveProceed(state, state.tables, Math.random);
    dispatch({ type: 'applyHexResult', result });
  }, [state]);

  const advanceOnly = useCallback(() => {
    const result = resolveAdvanceOnly(state, state.tables, Math.random);
    dispatch({ type: 'applyHexResult', result });
  }, [state]);

  const advanceManual = useCallback((hours) => {
    const numericHours = Number(hours);
    if (!Number.isFinite(numericHours) || numericHours <= 0) return;
    const result = resolveManualAdvance(state, numericHours, state.tables, Math.random);
    dispatch({ type: 'applyHexResult', result });
  }, [state]);

  const generateDungeon = useCallback((config) => {
    if (!isValidRoomCount(config.roomCount)) return false;
    const result = createDungeon(config, state.tables, Math.random);
    dispatch({ type: 'setDungeonResult', result });
    return true;
  }, [state.tables]);

  const generateQuests = useCallback((config) => {
    const result = createQuests(config, state.tables, Math.random);
    dispatch({ type: 'setQuestResult', result });
    return true;
  }, [state.tables]);

  const value = useMemo(() => ({
    state,
    dispatch,
    instanceId,
    instanceSaved,
    saveInstance,
    saveTables,
    resetTables,
    proceed,
    advanceOnly,
    advanceManual,
    generateDungeon,
    generateQuests,
  }), [state, instanceId, instanceSaved, saveInstance, saveTables, resetTables, proceed, advanceOnly, advanceManual, generateDungeon, generateQuests]);

  return (
    <GmBoardContext.Provider value={value}>
      {children}
    </GmBoardContext.Provider>
  );
}

export function useGmBoard() {
  const context = useContext(GmBoardContext);
  if (!context) throw new Error('useGmBoard must be used within GmBoardProvider.');
  return context;
}
