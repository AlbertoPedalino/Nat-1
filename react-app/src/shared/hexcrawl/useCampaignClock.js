import { useCallback, useEffect, useRef, useState } from 'react';
import {
  appendCampaignLog,
  listCampaignLog,
  readCampaignClock,
  saveCampaignClock,
  subscribeHexcrawl,
} from '../cloud/hexcrawl.js';
import { useAuth } from '../cloud/AuthProvider.jsx';

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
  // The last clock this browser wrote. An echo of our own write carries nothing
  // new, and applying it would fight whatever the GM did in the meantime.
  const lastWriteRef = useRef(0);

  const active = Boolean(cloudEnabled && campaignId && status === 'authed');

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
      setState({ clock, log, loading: false });
      setError(null);
      return clock;
    } catch (cause) {
      setState((current) => ({ ...current, loading: false }));
      setError(cause?.message || 'Could not read the campaign clock.');
      return null;
    }
  }, [active, campaignId, withLog]);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (!active) return undefined;
    return subscribeHexcrawl({
      campaignId,
      onClock: (clock) => {
        if (!clock) return;
        if (clock.updatedAt && clock.updatedAt <= lastWriteRef.current) return;
        setState((current) => ({ ...current, clock }));
      },
    });
  }, [active, campaignId]);

  // Returns the row as saved, so a caller can tell whether the clock it just
  // pushed is the one the table is now on.
  const saveClock = useCallback(async (next, { logEntry = null } = {}) => {
    if (!active) return null;
    const saved = await saveCampaignClock(campaignId, next);
    lastWriteRef.current = saved?.updatedAt || Date.now();
    setState((current) => ({ ...current, clock: saved }));
    if (logEntry) {
      const entry = await appendCampaignLog(campaignId, logEntry);
      if (entry && withLog) {
        setState((current) => ({ ...current, log: [entry, ...current.log].slice(0, 50) }));
      }
    }
    return saved;
  }, [active, campaignId, withLog]);

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
