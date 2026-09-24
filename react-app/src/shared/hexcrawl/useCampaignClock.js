import { useCallback, useEffect, useRef, useState } from 'react';
import {
  appendCampaignLog,
  listCampaignLog,
  readCampaignClock,
  saveCampaignClock,
  subscribeHexcrawl,
} from '../cloud/api/hexcrawl.js';
import { useAuth } from '../cloud/auth/AuthProvider.jsx';
import { coalesceReturns } from '../cloud/sync/returnGate.js';

// The campaign's travelling clock, shared by the GM Board and the map.
//
// Whoever has it open follows the row; whoever moves the party writes it. The
// write is explicit — a hex entry, an advance — and never a reaction to state
// changing, or the two screens would echo each other's updates forever.

const IDLE = Object.freeze({ clock: null, log: [], loading: false });
// Realtime is the live path; this is only the safety net for missed events.
export const CLOCK_FALLBACK_MS = 60_000;

function sameLog(a, b) {
  if (a === b) return true;
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
  return a.every((entry, index) => (
    entry?.id === b[index]?.id && JSON.stringify(entry) === JSON.stringify(b[index])
  ));
}

export function useCampaignClock(campaignId, { withLog = false } = {}) {
  const { cloudEnabled, status } = useAuth();
  const [state, setState] = useState(IDLE);
  const [error, setError] = useState(null);
  const clockRef = useRef(null);
  const scopeRef = useRef(null);
  // Date, weather and map movement can be changed within the same render tick.
  // Preserve the order the GM made those changes instead of racing two upserts.
  const saveQueueRef = useRef(Promise.resolve(null));

  const active = Boolean(cloudEnabled && campaignId && status === 'authed');

  useEffect(() => {
    const scope = active ? campaignId : null;
    scopeRef.current = scope;
    clockRef.current = null;
    setState(IDLE);
    setError(null);
    return () => { scopeRef.current = null; };
  }, [active, campaignId]);

  const acceptClock = useCallback((clock) => {
    const previous = clockRef.current;
    if (previous && (!clock || clock.updatedAt < previous.updatedAt)) return previous;
    if (JSON.stringify(previous) === JSON.stringify(clock)) return previous;
    clockRef.current = clock;
    setState((current) => ({ ...current, clock }));
    return clock;
  }, []);

  const loadedRef = useRef(false);

  const acceptLog = useCallback((log) => {
    setState((current) => (sameLog(current.log, log) ? current : { ...current, log }));
  }, []);

  const readLog = useCallback(async () => {
    if (!active || !withLog) return;
    try {
      const log = await listCampaignLog(campaignId);
      if (scopeRef.current === campaignId) acceptLog(log);
    } catch (_) {
      // The next focus, reconnect or clock event reads it again.
    }
  }, [acceptLog, active, campaignId, withLog]);

  // `includeLog: false` is the quiet safety poll: the clock row only, and no
  // loading flag, so an idle table neither re-renders nor re-reads the GM log.
  const refresh = useCallback(async ({ includeLog = true } = {}) => {
    if (!active) {
      setState(IDLE);
      return null;
    }
    const firstLoad = !loadedRef.current;
    if (firstLoad) setState((current) => (current.loading ? current : { ...current, loading: true }));
    try {
      const [clock, log] = await Promise.all([
        readCampaignClock(campaignId),
        withLog && includeLog ? listCampaignLog(campaignId) : Promise.resolve(null),
      ]);
      if (scopeRef.current !== campaignId) return null;
      loadedRef.current = true;
      const latest = acceptClock(clock);
      if (log) acceptLog(log);
      if (firstLoad) setState((current) => ({ ...current, loading: false }));
      setError(null);
      return latest;
    } catch (cause) {
      if (scopeRef.current !== campaignId) return null;
      if (firstLoad) setState((current) => ({ ...current, loading: false }));
      setError(cause?.message || 'Could not read the campaign clock.');
      return null;
    }
  }, [acceptClock, acceptLog, active, campaignId, withLog]);

  useEffect(() => {
    loadedRef.current = false;
    refresh();
    if (!active) return undefined;
    // Realtime carries changes; this only recovers ones missed while a phone
    // slept or a tab sat in the background.
    const onReturn = coalesceReturns(() => refresh());
    const onVisible = () => { if (document.visibilityState === 'visible') onReturn(); };
    const timer = setInterval(() => refresh({ includeLog: false }), CLOCK_FALLBACK_MS);
    window.addEventListener('focus', onReturn);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', onReturn);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [active, refresh]);

  useEffect(() => {
    if (!active) return undefined;
    let subscribedOnce = false;
    return subscribeHexcrawl({
      campaignId,
      onClock: (clock) => {
        if (!clock || scopeRef.current !== campaignId) return;
        const before = clockRef.current;
        // A clock move from elsewhere usually comes with a log entry. Our own
        // save echoing back changes nothing and costs nothing.
        if (acceptClock(clock) !== before) readLog();
      },
      onStatus: (status) => {
        if (status !== 'SUBSCRIBED') return;
        // The first subscription follows the mount read; later ones are
        // reconnects, which do not replay what was missed.
        if (subscribedOnce) refresh();
        subscribedOnce = true;
      },
    });
  }, [acceptClock, active, campaignId, readLog, refresh]);

  // Returns the row as saved, so a caller can tell whether the clock it just
  // pushed is the one the table is now on.
  const saveClock = useCallback((next, { logEntry = null } = {}) => {
    if (!active) return Promise.resolve(null);
    const save = async () => {
      if (scopeRef.current !== campaignId) return null;
      // A click can beat the initial read. Check for an existing campaign row
      // before seeding, so loading is never mistaken for a brand-new campaign.
      if (typeof next === 'function' && !clockRef.current) {
        const existing = await readCampaignClock(campaignId);
        if (scopeRef.current !== campaignId) return null;
        acceptClock(existing);
      }
      // Resolve initial defaults at execution time: the preceding queued write
      // may already have created the row or configured travel selections.
      const patch = typeof next === 'function' ? next(clockRef.current) : next;
      const saved = await saveCampaignClock(campaignId, patch);
      if (scopeRef.current === campaignId) acceptClock(saved);
      if (logEntry) {
        const entry = await appendCampaignLog(campaignId, logEntry);
        if (entry && withLog && scopeRef.current === campaignId) {
          setState((current) => ({ ...current, log: [entry, ...current.log].slice(0, 50) }));
        }
      }
      return saved;
    };
    const queued = saveQueueRef.current.catch(() => null).then(save);
    saveQueueRef.current = queued;
    return queued;
  }, [acceptClock, active, campaignId, withLog]);

  return {
    active,
    clock: state.clock,
    log: state.log,
    loading: state.loading,
    error,
    refresh,
    saveClock,
  };
}
