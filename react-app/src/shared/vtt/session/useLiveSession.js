import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../cloud/auth/AuthProvider.jsx';
import { supabase } from '../../cloud/supabaseClient.js';
import { listLiveSceneIds } from '../../cloud/api/vtt.js';
import { coalesceReturns } from '../../cloud/sync/returnGate.js';

const SESSION_RECONCILE_MS = 30_000;

// A player has no scene list — they pick a campaign and join its session, which
// is wherever that GM has the projector pointed. When the GM switches scenes the
// player follows automatically; there is nothing for them to pick.
//
// Several campaigns can be running at once, so the session is always scoped to
// one: without the filter a player at two tables would be yanked between them.
//
// The subscription is campaign-wide rather than scene-specific: the event that
// matters is another row becoming live, which a scene channel would never see.
// The scene itself (fog, grid, tokens) is useSceneLive's business: this hook
// only answers "which id is live", from a query that carries nothing else.

export function useLiveSession({ campaignId, enabled = true } = {}) {
  const { cloudEnabled, status } = useAuth();
  const [session, setSession] = useState({ loading: true, scene: null });
  const refreshRequestRef = useRef(0);
  const sceneRef = useRef(null);
  sceneRef.current = session.scene;

  const refresh = useCallback(async () => {
    const request = ++refreshRequestRef.current;
    try {
      const scenes = await listLiveSceneIds(campaignId);
      if (request !== refreshRequestRef.current) return;
      const scene = scenes.find((entry) => entry.campaignId === campaignId) || null;
      setSession((current) => (
        !current.loading && current.scene?.id === scene?.id ? current : { loading: false, scene }
      ));
    } catch (_) {
      // Realtime recovery and the safety poll are best-effort. A momentary
      // network failure must not throw a player off the map they already have.
      if (request === refreshRequestRef.current) {
        setSession((current) => ({ loading: false, scene: current.scene }));
      }
    }
  }, [campaignId]);

  useEffect(() => {
    if (!enabled || !campaignId || !cloudEnabled || status !== 'authed') {
      refreshRequestRef.current += 1;
      setSession({ loading: false, scene: null });
      return undefined;
    }
    // Do not keep a scene from another campaign on screen while this session is
    // being resolved.
    setSession({ loading: true, scene: null });
    refresh();

    if (!supabase) return undefined;
    let channel;
    try {
      channel = supabase.channel(`gb-vtt-session-${campaignId}`);
      // Any scene change in this campaign can mean the projector moved.
      // Re-reading is cheap and avoids reasoning about which events RLS lets
      // through: a row leaving the live state stops being visible, so its own
      // event may never arrive.
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'map_scenes', filter: `campaign_id=eq.${campaignId}` },
        (payload) => {
          // The live scene editing itself (a fog stroke, the grid, a rename)
          // does not move the table: the scene channel already has that row.
          const row = payload?.new;
          const live = sceneRef.current;
          if (row?.id && live?.id === row.id && row.is_live === true) return;
          refresh();
        },
      );
      channel.subscribe((state) => {
        // There is a small gap between the first read and the subscription
        // becoming active. A live switch in that gap has no event to replay.
        // SUBSCRIBED is also emitted again after a socket reconnect, so this
        // read repairs both cases from the authoritative database state.
        if (state === 'SUBSCRIBED') refresh();
      });
    } catch (_) {
      try {
        if (channel) supabase.removeChannel(channel);
      } catch (__) {}
      return undefined;
    }

    // Realtime transports can occasionally miss a change while a phone sleeps,
    // changes network, or keeps the tab in the background. These inexpensive
    // reconciliations make the session self-healing without a page reload.
    const reconcile = () => { refresh(); };
    const reconcileOnReturn = coalesceReturns(reconcile);
    const reconcileWhenVisible = () => {
      if (document.visibilityState === 'visible') reconcileOnReturn();
    };
    const timer = window.setInterval(reconcile, SESSION_RECONCILE_MS);
    window.addEventListener('online', reconcile);
    window.addEventListener('focus', reconcileOnReturn);
    document.addEventListener('visibilitychange', reconcileWhenVisible);

    return () => {
      refreshRequestRef.current += 1;
      window.clearInterval(timer);
      window.removeEventListener('online', reconcile);
      window.removeEventListener('focus', reconcileOnReturn);
      document.removeEventListener('visibilitychange', reconcileWhenVisible);
      try {
        supabase.removeChannel(channel);
      } catch (_) {}
    };
  }, [campaignId, cloudEnabled, enabled, refresh, status]);

  return { ...session, refresh };
}
