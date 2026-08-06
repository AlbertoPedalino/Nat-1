import {
  createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState,
} from 'react';
import { gmBoardReducer, createInitialState } from './reducer.js';
import { useGmBoardPersistence } from '../hooks/useGmBoardPersistence.js';
import { resolveProceed, resolveAdvanceOnly, resolveManualAdvance } from '../logic/hex.js';
import { clockFromResult } from '../../../shared/hexcrawl/hexEntry.js';
import { useCampaignClock } from '../../../shared/hexcrawl/useCampaignClock.js';
import { setCampaignHexcrawlBoard } from '../../../shared/cloud/hexcrawl.js';
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

  // A board bound to a campaign keeps that campaign's clock, and so does its
  // map: both read the same row and write it only when the party actually
  // moves. localStorage stays the mirror it has always been, so an unbound
  // board — or one whose GM is offline — behaves exactly as before.
  const campaignClock = useCampaignClock(state.campaignId);
  const [clockError, setClockError] = useState(null);
  const appliedClockRef = useRef(null);

  useEffect(() => {
    const clock = campaignClock.clock;
    if (!clock) return;
    // Applied once per version. Without this the dispatch would re-run on every
    // render that produced a new object and stamp over the GM's own edits.
    const stamp = clock.updatedAt || 0;
    if (appliedClockRef.current === stamp) return;
    appliedClockRef.current = stamp;
    dispatch({ type: 'applyClock', clock });
  }, [campaignClock.clock]);

  const pushClock = useCallback((result) => {
    if (!campaignClock.active) return;
    campaignClock
      .saveClock({ ...clockFromResult(result), season: state.season }, { logEntry: result.logEntry })
      .then(() => setClockError(null))
      .catch((cause) => setClockError(cause?.message || 'Could not save the campaign clock.'));
  }, [campaignClock, state.season]);

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

  // Both directions in one move: the board remembers its campaign, and the
  // campaign remembers which board holds its tables — that second pointer is
  // what the map reads, and it is the one the database enforces as unique.
  const bindCampaign = useCallback(async (campaignId) => {
    const previous = state.campaignId;
    dispatch({ type: 'setCampaign', campaignId });
    try {
      if (previous && previous !== campaignId) await setCampaignHexcrawlBoard(previous, null);
      if (campaignId) await setCampaignHexcrawlBoard(campaignId, instanceId);
      setClockError(null);
      return true;
    } catch (cause) {
      setClockError(cause?.message || 'Could not link this board to that campaign.');
      return false;
    }
  }, [instanceId, state.campaignId]);

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
    bindCampaign,
    campaignLinked: campaignClock.active,
    clockError: clockError || campaignClock.error,
  }), [state, instanceId, instanceSaved, saveInstance, saveTables, resetTables, proceed, advanceOnly, advanceManual, generateDungeon, generateQuests, bindCampaign, campaignClock.active, campaignClock.error, clockError]);

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
