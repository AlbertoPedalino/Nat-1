import {
  createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState,
} from 'react';
import { gmBoardReducer, createInitialState } from './reducer.js';
import { useGmBoardPersistence } from './useGmBoardPersistence.js';
import { resolveProceed, resolveAdvanceOnly, resolveManualAdvance } from '../../../shared/hexcrawl/hexRules.js';
import { clockFromResult, clockSeedPatch } from '../../../shared/hexcrawl/hexEntry.js';
import { useCampaignClock } from '../../../shared/hexcrawl/useCampaignClock.js';
import { useBoardCampaign } from '../../../shared/hexcrawl/useBoardCampaign.js';
import { createDungeon, isValidRoomCount } from '../../../shared/dungeon/dungeon.js';
import { createQuests } from '../quests/quest.js';
import { rollTable } from '../tables/rollTable.js';
import { makeId } from '../../../shared/ids.js';
import { failureMessage } from '../../../shared/ui/busyAction.js';

const GmBoardContext = createContext(null);

// The Travel picks the campaign's clock keeps, by the action that sets them.
const CLOCK_SELECTIONS = Object.freeze({
  setTerrain: 'terrain', setPop: 'pop', setHexTier: 'hexTier', setMountSpeed: 'mountSpeed',
});

export function GmBoardProvider({ instanceId, children }) {
  const [state, dispatch] = useReducer(gmBoardReducer, undefined, createInitialState);
  useGmBoardPersistence({ instanceId, state, dispatch });

  // A board bound to a campaign keeps that campaign's clock, and so does its
  // map: both read the same row and write it only when the party actually
  // moves. localStorage stays the mirror it has always been, so an unbound
  // board — or one whose GM is offline — behaves exactly as before.
  const campaignLink = useBoardCampaign(instanceId);
  const campaignClock = useCampaignClock(campaignLink.campaign?.id);
  const [clockError, setClockError] = useState(null);
  const appliedClockRef = useRef(null);
  const clockStateRef = useRef(state);
  clockStateRef.current = state;

  useEffect(() => {
    const clock = campaignClock.clock;
    if (!clock) return;
    // The clock hook retains the object for unchanged snapshots. Apply each
    // distinct update, including writes sharing the same millisecond timestamp.
    if (appliedClockRef.current === clock) return;
    appliedClockRef.current = clock;
    dispatch({ type: 'applyClock', clock });
  }, [campaignClock.clock]);

  const pushClock = useCallback((result) => {
    if (!campaignClock.active) return;
    campaignClock
      .saveClock({ ...clockFromResult(result), season: state.season }, { logEntry: result.logEntry })
      .then(() => setClockError(null))
      .catch((cause) => setClockError(failureMessage('Could not save the campaign clock.', cause)));
  }, [campaignClock, state.season]);

  const pushClockState = useCallback((nextState, patch) => {
    if (!campaignClock.active) return;
    campaignClock
      .saveClock((current) => ({ ...clockSeedPatch(current, nextState), ...patch }))
      .then(() => setClockError(null))
      .catch((cause) => setClockError(failureMessage('Could not save the campaign clock.', cause)));
  }, [campaignClock]);

  // Every hand edit of the clock or the travel picks: applied here, and written
  // to the campaign's clock as the fields it changed (`patchOf(nextState)`).
  const editClock = useCallback((action, patchOf) => {
    const nextState = gmBoardReducer(clockStateRef.current, action);
    clockStateRef.current = nextState;
    dispatch(action);
    pushClockState(nextState, patchOf(nextState));
  }, [pushClockState]);

  const dispatchSelection = useCallback((action) => {
    const field = CLOCK_SELECTIONS[action.type];
    if (!field) {
      dispatch(action);
      return;
    }
    editClock(action, (next) => ({ [field]: next[field] }));
  }, [editClock]);

  const setStart = useCallback(({ day, month, year, min }) => editClock(
    { type: 'setStart', day, month, year, min },
    () => ({ day, month, year, min }),
  ), [editClock]);

  const setTime = useCallback((min) => editClock({ type: 'setTimeOnly', min }, () => ({ min })), [editClock]);

  const setSeason = useCallback(
    (season) => editClock({ type: 'setSeason', season }, () => ({ season: season || null })),
    [editClock],
  );

  const setWeatherOverride = useCallback(({ weather, intensity }) => editClock(
    { type: 'setWeatherOverride', weather, intensity },
    () => ({ weather, intensity }),
  ), [editClock]);

  const proceed = useCallback(() => {
    const result = resolveProceed(state, state.tables, Math.random);
    dispatch({ type: 'applyHexResult', result });
    pushClock(result);
  }, [pushClock, state]);

  const advanceOnly = useCallback(() => {
    const result = resolveAdvanceOnly(state, state.tables, Math.random);
    dispatch({ type: 'applyHexResult', result });
    pushClock(result);
  }, [pushClock, state]);

  const advanceManual = useCallback((hours) => {
    const numericHours = Number(hours);
    if (!Number.isFinite(numericHours) || numericHours <= 0) return;
    const result = resolveManualAdvance(state, numericHours, state.tables, Math.random);
    dispatch({ type: 'applyHexResult', result });
    pushClock(result);
  }, [pushClock, state]);

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

  const rollOnTable = useCallback((tableId) => {
    const roll = rollTable(state.tables, tableId, { tier: state.rollTier }, Math.random);
    if (!roll) return;
    dispatch({ type: 'addRoll', roll: { ...roll, id: makeId('roll') } });
  }, [state.tables, state.rollTier]);

  const value = useMemo(() => ({
    state,
    dispatch: dispatchSelection,
    setStart,
    setTime,
    setSeason,
    setWeatherOverride,
    proceed,
    advanceOnly,
    advanceManual,
    generateDungeon,
    generateQuests,
    rollOnTable,
    clockError: clockError || campaignClock.error || campaignLink.error,
  }), [state, dispatchSelection, setStart, setTime, setSeason, setWeatherOverride, proceed, advanceOnly, advanceManual, generateDungeon, generateQuests, rollOnTable, campaignLink.error, campaignClock.error, clockError]);

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
