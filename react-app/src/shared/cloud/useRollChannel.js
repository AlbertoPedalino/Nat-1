import { useCallback, useEffect, useRef } from 'react';
import { useAuth } from './AuthProvider.jsx';
import { supabase } from './supabaseClient.js';

// Rolls said out loud at the table.
//
// Scoped to the CAMPAIGN, not to a scene: the sheet that makes a roll has no
// idea which map is up, and should not have to learn. Everyone in the campaign
// joins the same channel — the sheets to publish, the map to listen.
//
// Broadcast only. A roll is an event, not a record: nothing is written, nothing
// survives a reload, and there is no history for anyone to clean up.

const ROLL_EVENT = 'roll';

export function useRollChannel({ campaignId, onRoll }) {
  const { cloudEnabled, status } = useAuth();
  const channelRef = useRef(null);
  const handlerRef = useRef(onRoll);
  handlerRef.current = onRoll;

  useEffect(() => {
    if (!campaignId || !cloudEnabled || status !== 'authed' || !supabase) return undefined;

    let channel;
    try {
      channel = supabase.channel(`gb-rolls-${campaignId}`, {
        // Your own roll is already on your screen in its own toast; echoing it
        // back would show it twice.
        config: { broadcast: { self: false } },
      });
      channel.on('broadcast', { event: ROLL_EVENT }, (message) => {
        try {
          handlerRef.current?.(message?.payload || null);
        } catch (_) {
          // A malformed roll must not take the page down with it.
        }
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
      } catch (_) {}
    };
  }, [campaignId, cloudEnabled, status]);

  // Fire and forget: a roll that fails to reach the table is a roll the player
  // says out loud, not an error worth interrupting them with.
  const publish = useCallback((roll) => {
    const channel = channelRef.current;
    if (!channel || !roll) return;
    try {
      channel.send({ type: 'broadcast', event: ROLL_EVENT, payload: roll });
    } catch (_) {}
  }, []);

  return { publish };
}
