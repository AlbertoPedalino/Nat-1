import { useCallback, useEffect, useRef } from 'react';
import { useAuth } from '../cloud/AuthProvider.jsx';
import { supabase } from '../cloud/supabaseClient.js';

// One channel per scene carries both streams: committed row changes for tokens
// and the scene itself, plus ephemeral drag previews.
//
// RLS applies to realtime exactly as it does to a query, so a player is never
// sent GM-layer rows here either — the filter is not something this hook has to
// reimplement.

const DRAG_EVENT = 'token-drag';

export function useSceneLive({
  sceneId,
  campaignId,
  onTokenEvent,
  onSceneEvent,
  onRemoteDrag,
  onDrawingEvent,
  onCharacterEvent,
}) {
  const { cloudEnabled, status, user } = useAuth();
  const channelRef = useRef(null);
  const handlers = useRef({});
  handlers.current = { onTokenEvent, onSceneEvent, onRemoteDrag, onDrawingEvent, onCharacterEvent };

  useEffect(() => {
    if (!sceneId || !cloudEnabled || status !== 'authed' || !supabase) return undefined;

    let channel;
    try {
      channel = supabase.channel(`gb-vtt-${sceneId}`, {
        // Our own drags are already on screen; echoing them back would fight the
        // local pointer.
        config: { broadcast: { self: false } },
      });

      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'map_tokens', filter: `scene_id=eq.${sceneId}` },
        (payload) => {
          try {
            handlers.current.onTokenEvent?.(payload);
          } catch (_) {
            // Realtime is opportunistic: a bad payload must not break the scene.
          }
        },
      );

      channel.on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'map_scenes', filter: `id=eq.${sceneId}` },
        (payload) => {
          try {
            handlers.current.onSceneEvent?.(payload);
          } catch (_) {}
        },
      );

      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'map_drawings', filter: `scene_id=eq.${sceneId}` },
        (payload) => {
          try {
            handlers.current.onDrawingEvent?.(payload);
          } catch (_) {}
        },
      );

      // Character sheets, scoped to the campaign rather than the scene: damage
      // taken on a sheet has to show on the piece without a reload, and the
      // sheet stays the one place those hit points live.
      if (campaignId) {
        channel.on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'characters', filter: `campaign_id=eq.${campaignId}` },
          (payload) => {
            try {
              handlers.current.onCharacterEvent?.(payload);
            } catch (_) {}
          },
        );
      }

      channel.on('broadcast', { event: DRAG_EVENT }, (message) => {
        try {
          handlers.current.onRemoteDrag?.(message?.payload || null);
        } catch (_) {}
      });

      channel.subscribe();
      channelRef.current = channel;
    } catch (_) {
      channelRef.current = null;
      return undefined;
    }

    return () => {
      channelRef.current = null;
      try {
        supabase.removeChannel(channel);
      } catch (_) {
        // Already closed.
      }
    };
  }, [campaignId, cloudEnabled, sceneId, status]);

  // Fire-and-forget: a lost drag frame is a cosmetic glitch, and the committed
  // position arrives on drop regardless.
  const sendDrag = useCallback((payload) => {
    const channel = channelRef.current;
    if (!channel) return;
    try {
      channel.send({
        type: 'broadcast',
        event: DRAG_EVENT,
        payload: { ...payload, actor: user?.id || null },
      });
    } catch (_) {}
  }, [user?.id]);

  return { sendDrag };
}
