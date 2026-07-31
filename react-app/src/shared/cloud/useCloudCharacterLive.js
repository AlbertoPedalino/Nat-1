import { useEffect, useId, useRef } from 'react';
import { useAuth } from './AuthProvider.jsx';
import { supabase } from './supabaseClient.js';

function channelSuffix(charId, instanceId) {
  return `${charId || 'character'}-${instanceId}`
    .replace(/[^a-z0-9_-]/gi, '_')
    .slice(0, 90);
}

export function useCloudCharacterLive({ charId, enabled = true, onUpdate } = {}) {
  const { cloudEnabled, status, user } = useAuth();
  const instanceId = useId();
  const onUpdateRef = useRef(onUpdate);

  onUpdateRef.current = onUpdate;

  useEffect(() => {
    const id = charId ? String(charId) : '';
    if (!enabled || !id || !cloudEnabled || status !== 'authed' || !user?.id || !supabase) {
      return undefined;
    }

    const handlePayload = (payload) => {
      try {
        const row = payload?.new;
        if (!row || String(row.id || '') !== id || !row.data || typeof row.data !== 'object') return;
        onUpdateRef.current?.(row);
      } catch (_) {
        // Realtime is opportunistic; bad payloads should not break sheet viewing.
      }
    };

    let channel;
    try {
      channel = supabase.channel(`gb-character-live-${channelSuffix(id, instanceId)}`);
      channel.on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'characters',
        filter: `id=eq.${id}`,
      }, handlePayload);
      channel.subscribe();
    } catch (_) {
      try {
        if (channel) supabase.removeChannel(channel);
      } catch (__) {
        // Ignore cleanup failures when setup only partially completed.
      }
      return undefined;
    }

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch (_) {
        // Cleanup remains fail-soft if the socket was already closed.
      }
    };
  }, [charId, enabled, cloudEnabled, status, user?.id, instanceId]);
}
