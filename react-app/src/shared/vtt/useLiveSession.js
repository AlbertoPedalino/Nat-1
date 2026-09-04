import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../cloud/AuthProvider.jsx';
import { supabase } from '../cloud/supabaseClient.js';
import { listLiveScenes } from '../cloud/vtt.js';

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

export function useLiveSession({ campaignId, enabled = true } = {}) {
  const { cloudEnabled, status } = useAuth();
  const [session, setSession] = useState({ loading: true, scene: null });
  const refreshRequestRef = useRef(0);

  const refresh = useCallback(async () => {
    const request = ++refreshRequestRef.current;
    try {
      const scenes = await listLiveScenes();
      if (request !== refreshRequestRef.current) return;
      const scene = scenes.find((entry) => entry.campaignId === campaignId) || null;
      setSession({ loading: false, scene });
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
        () => { refresh(); },
      );
      channel.subscribe((state) => {
        // There is a small gap between the first read and the subscription
        // becoming active. A live switch in that gap has no event to replay.
        // SUBSCRIBED is also emitted again after a socket reconnect, so this
        // read repairs both cases from the authoritative database state.
        if (state === 'SUBSCRIBED') refresh();
      });
    } catch (_) {
      return undefined;
    }

    // Realtime transports can occasionally miss a change while a phone sleeps,
    // changes network, or keeps the tab in the background. These inexpensive
    // reconciliations make the session self-healing without a page reload.
    const reconcile = () => { refresh(); };
    const reconcileWhenVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    const timer = window.setInterval(reconcile, SESSION_RECONCILE_MS);
    window.addEventListener('online', reconcile);
    window.addEventListener('focus', reconcile);
    document.addEventListener('visibilitychange', reconcileWhenVisible);

    return () => {
      refreshRequestRef.current += 1;
      window.clearInterval(timer);
      window.removeEventListener('online', reconcile);
      window.removeEventListener('focus', reconcile);
      document.removeEventListener('visibilitychange', reconcileWhenVisible);
      try {
        supabase.removeChannel(channel);
      } catch (_) {}
    };
  }, [campaignId, cloudEnabled, enabled, refresh, status]);

  return { ...session, refresh };
}
