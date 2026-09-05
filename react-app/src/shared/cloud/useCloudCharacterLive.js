import { useEffect, useId, useRef } from 'react';
import { useAuth } from './AuthProvider.jsx';
import { supabase } from './supabaseClient.js';
import { getCloudCharacter } from './cloudCharacters.js';

const CHARACTER_RECONCILE_MS = 30_000;

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

    let alive = true;
    let refreshRequest = 0;
    let newestRowTime = 0;

    const deliverRow = (row) => {
      try {
        if (!row || String(row.id || '') !== id || !row.data || typeof row.data !== 'object') return;
        const rowTime = Date.parse(row.updated_at || '');
        if (Number.isFinite(rowTime) && rowTime < newestRowTime) return;
        if (Number.isFinite(rowTime)) newestRowTime = rowTime;
        onUpdateRef.current?.(row);
      } catch (_) {
        // Realtime is opportunistic; bad payloads should not break sheet viewing.
      }
    };

    const handlePayload = (payload) => deliverRow(payload?.new);

    // Postgres changes are not replayed after a sleeping phone or a brief
    // network loss. Re-read the authoritative row on every recovery boundary,
    // and periodically while the sheet remains open.
    const refresh = async () => {
      const request = ++refreshRequest;
      try {
        const row = await getCloudCharacter(id);
        if (alive && request === refreshRequest) deliverRow(row);
      } catch (_) {
        // A later reconnect, focus event or safety poll retries silently.
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
      channel.subscribe((state) => {
        if (state === 'SUBSCRIBED') refresh();
      });
    } catch (_) {
      try {
        if (channel) supabase.removeChannel(channel);
      } catch (__) {
        // Ignore cleanup failures when setup only partially completed.
      }
      return undefined;
    }

    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    const timer = window.setInterval(refresh, CHARACTER_RECONCILE_MS);
    window.addEventListener('online', refresh);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refreshWhenVisible);

    return () => {
      alive = false;
      refreshRequest += 1;
      window.clearInterval(timer);
      window.removeEventListener('online', refresh);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
      try {
        supabase.removeChannel(channel);
      } catch (_) {
        // Cleanup remains fail-soft if the socket was already closed.
      }
    };
  }, [charId, enabled, cloudEnabled, status, user?.id, instanceId]);
}
