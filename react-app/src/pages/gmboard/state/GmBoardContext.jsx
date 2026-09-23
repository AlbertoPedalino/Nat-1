import {
  createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState,
} from 'react';
import { gmBoardReducer, createInitialState } from './reducer.js';
import { useGmBoardPersistence } from './useGmBoardPersistence.js';
import { resolveProceed, resolveAdvanceOnly, resolveManualAdvance } from '../hexcrawl/hex.js';
import { clockFromResult, clockFromState, travelFromState } from '../../../shared/hexcrawl/hexEntry.js';
import { useCampaignClock } from '../../../shared/hexcrawl/useCampaignClock.js';
import { useBoardCampaign } from '../../../shared/hexcrawl/useBoardCampaign.js';
import { createDungeon, isValidRoomCount } from '../dungeon/dungeon.js';
import { createQuests } from '../quests/quest.js';

const GmBoardContext = createContext(null);

export function GmBoardProvider({ instanceId, instanceSaved, linkGroupId, onInstanceSaved, children }) {
  const [state, dispatch] = useReducer(gmBoardReducer, undefined, createInitialState);
  const { saveInstance, resetTables } = useGmBoardPersistence({
    instanceId,
    instanceSaved,
    linkGroupId,
    state,
    dispatch,
    onSaved: onInstanceSaved,
  });

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
      .catch((cause) => setClockError(cause?.message || 'Could not save the campaign clock.'));
  }, [campaignClock, state.season]);

  const pushClockState = useCallback((nextState, patch) => {
    if (!campaignClock.active) return;
    campaignClock
      // Seed every field when the campaign has no clock yet. Afterwards only
      // write what the GM changed, so a map move in another tab cannot have its
      // newer weather or date overwritten by an unrelated selector.
      .saveClock((current) => ({
        ...(!current ? clockFromState(nextState) : {}),
        ...(!current?.travelConfigured ? {
          ...travelFromState(nextState), travelConfigured: true,
          season: current?.season || nextState.season,
        } : {}),
        ...patch,
      }))
      .then(() => setClockError(null))
      .catch((cause) => setClockError(cause?.message || 'Could not save the campaign clock.'));
  }, [campaignClock]);

  const dispatchSelection = useCallback((action) => {
    const field = {
      setTerrain: 'terrain', setPop: 'pop', setHexTier: 'hexTier', setMountSpeed: 'mountSpeed',
    }[action.type];
    dispatch(action);
    if (!field) return;
    const nextState = gmBoardReducer(clockStateRef.current, action);
    clockStateRef.current = nextState;
    pushClockState(nextState, { [field]: nextState[field] });
  }, [pushClockState]);

  const setStart = useCallback(({ day, month, year, min }) => {
    const nextState = { ...clockStateRef.current, day, month, year, min, log: [] };
    clockStateRef.current = nextState;
    dispatch({ type: 'setStart', day, month, year, min });
    pushClockState(nextState, { day, month, year, min });
  }, [pushClockState]);

  const setTime = useCallback((min) => {
    const nextState = { ...clockStateRef.current, min };
    clockStateRef.current = nextState;
    dispatch({ type: 'setTimeOnly', min });
    pushClockState(nextState, { min });
  }, [pushClockState]);

  const setSeason = useCallback((season) => {
    const nextState = { ...clockStateRef.current, season };
    clockStateRef.current = nextState;
    dispatch({ type: 'setSeason', season });
    pushClockState(nextState, { season: season || null });
  }, [pushClockState]);

  const setWeatherOverride = useCallback(({ meteo, intensity }) => {
    const nextState = { ...clockStateRef.current, meteo, intensity };
    clockStateRef.current = nextState;
    dispatch({ type: 'setWeatherOverride', meteo, intensity });
    pushClockState(nextState, { meteo, intensity });
  }, [pushClockState]);

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

  const value = useMemo(() => ({
    state,
    dispatch: dispatchSelection,
    instanceId,
    instanceSaved,
    saveInstance,
    resetTables,
    setStart,
    setTime,
    setSeason,
    setWeatherOverride,
    proceed,
    advanceOnly,
    advanceManual,
    generateDungeon,
    generateQuests,
    campaign: campaignLink.campaign,
    campaignLinked: campaignClock.active,
    clockError: clockError || campaignClock.error || campaignLink.error,
  }), [state, dispatchSelection, instanceId, instanceSaved, saveInstance, resetTables, setStart, setTime, setSeason, setWeatherOverride, proceed, advanceOnly, advanceManual, generateDungeon, generateQuests, campaignLink.campaign, campaignLink.error, campaignClock.active, campaignClock.error, clockError]);

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
