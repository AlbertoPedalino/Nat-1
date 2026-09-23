import { useCallback, useEffect, useRef, useState } from 'react';
import {
  appendCampaignLog,
  listCampaignLog,
  readCampaignClock,
  saveCampaignClock,
  subscribeHexcrawl,
} from '../cloud/api/hexcrawl.js';
import { useAuth } from '../cloud/auth/AuthProvider.jsx';

// The campaign's travelling clock, shared by the GM Board and the map.
//
// Whoever has it open follows the row; whoever moves the party writes it. The
// write is explicit — a hex entry, an advance — and never a reaction to state
// changing, or the two screens would echo each other's updates forever.

const IDLE = Object.freeze({ clock: null, log: [], loading: false });

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

  const refresh = useCallback(async () => {
    if (!active) {
      setState(IDLE);
      return null;
    }
    setState((current) => ({ ...current, loading: true }));
    try {
      const [clock, log] = await Promise.all([
        readCampaignClock(campaignId),
        withLog ? listCampaignLog(campaignId) : Promise.resolve([]),
      ]);
      if (scopeRef.current !== campaignId) return null;
      const latest = acceptClock(clock);
      setState((current) => ({ ...current, log, loading: false }));
      setError(null);
      return latest;
    } catch (cause) {
      if (scopeRef.current !== campaignId) return null;
      setState((current) => ({ ...current, loading: false }));
      setError(cause?.message || 'Could not read the campaign clock.');
      return null;
    }
  }, [acceptClock, active, campaignId, withLog]);

  useEffect(() => {
    refresh();
    if (!active) return undefined;
    // Recover missed Realtime events after sleep, reconnect or a background tab.
    const onFocus = () => refresh();
    const timer = setInterval(refresh, 5000);
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, [active, refresh]);

  useEffect(() => {
    if (!active) return undefined;
    return subscribeHexcrawl({
      campaignId,
      onClock: (clock) => {
        if (!clock || scopeRef.current !== campaignId) return;
        acceptClock(clock);
      },
    });
  }, [acceptClock, active, campaignId]);

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
