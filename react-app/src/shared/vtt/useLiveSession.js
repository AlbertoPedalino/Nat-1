import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../cloud/AuthProvider.jsx';
import { supabase } from '../cloud/supabaseClient.js';
import { listLiveScenes } from '../cloud/vtt.js';

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
  const sceneIdRef = useRef(null);

  const refresh = useCallback(async () => {
    try {
      const scenes = await listLiveScenes();
      const scene = scenes.find((entry) => entry.campaignId === campaignId) || null;
      sceneIdRef.current = scene?.id || null;
      setSession({ loading: false, scene });
    } catch (_) {
      setSession({ loading: false, scene: null });
    }
  }, [campaignId]);

  useEffect(() => {
    if (!enabled || !campaignId || !cloudEnabled || status !== 'authed') {
      setSession({ loading: false, scene: null });
      return undefined;
    }
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
      channel.subscribe();
    } catch (_) {
      return undefined;
    }

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch (_) {}
    };
  }, [campaignId, cloudEnabled, enabled, refresh, status]);

  return { ...session, refresh };
}
