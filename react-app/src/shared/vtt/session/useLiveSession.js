import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../cloud/auth/AuthProvider.jsx';
import { supabase } from '../../cloud/supabaseClient.js';
import { readLiveSceneId } from '../../cloud/api/vtt.js';
import { coalesceReturns } from '../../cloud/sync/returnGate.js';

const SESSION_RECONCILE_MS = 30_000;

// A player has no scene list — they pick a campaign and join its session, which
// is wherever that GM has the projector pointed. When the GM switches scenes the
// player follows automatically; there is nothing for them to pick.
//
// This hook answers one question: which scene of this campaign is live. It
// follows `campaign_live_scenes` (15_live_scenes.sql), a one-row-per-campaign
// projection the database keeps from `map_scenes.is_live`, and never the scene
// row itself — that is useSceneLive's, so a fog stroke reaches a player once.
//
// Several campaigns can be running at once, so the session is always scoped to
// one: without the filter a player at two tables would be yanked between them.

export function useLiveSession({ campaignId, enabled = true } = {}) {
  const { cloudEnabled, status } = useAuth();
  const [session, setSession] = useState({ loading: true, scene: null });
  const requestRef = useRef(0);

  const apply = useCallback((sceneId) => {
    const scene = sceneId ? { id: sceneId, campaignId } : null;
    setSession((current) => (
      !current.loading && current.scene?.id === scene?.id ? current : { loading: false, scene }
    ));
  }, [campaignId]);

  const refresh = useCallback(async () => {
    const request = ++requestRef.current;
    try {
      const sceneId = await readLiveSceneId(campaignId);
      if (request === requestRef.current) apply(sceneId);
    } catch (_) {
      // Recovery is best-effort. A momentary network failure must not throw a
      // player off the map they already have.
      if (request === requestRef.current) {
        setSession((current) => (current.loading ? { loading: false, scene: current.scene } : current));
      }
    }
  }, [apply, campaignId]);

  useEffect(() => {
    if (!enabled || !campaignId || !cloudEnabled || status !== 'authed') {
      requestRef.current += 1;
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
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'campaign_live_scenes', filter: `campaign_id=eq.${campaignId}` },
        (payload) => {
          const row = payload?.new;
          if (row && Object.hasOwn(row, 'scene_id')) {
            // The event is the answer; a read still in flight is older.
            requestRef.current += 1;
            apply(row.scene_id);
          } else {
            refresh();
          }
        },
      );
      channel.subscribe((state) => {
        // Covers the gap between the first read and the subscription going
        // live, and every reconnect: missed changes are not replayed.
        if (state === 'SUBSCRIBED') refresh();
      });
    } catch (_) {
      try {
        if (channel) supabase.removeChannel(channel);
      } catch (__) {}
      return undefined;
    }

    // One tiny row: cheap enough to re-read after sleep, network changes or a
    // background tab, which is when realtime can silently miss a change.
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
      requestRef.current += 1;
      window.clearInterval(timer);
      window.removeEventListener('online', reconcile);
      window.removeEventListener('focus', reconcileOnReturn);
      document.removeEventListener('visibilitychange', reconcileWhenVisible);
      try {
        supabase.removeChannel(channel);
      } catch (_) {}
    };
  }, [apply, campaignId, cloudEnabled, enabled, refresh, status]);

  return { ...session, refresh };
}
