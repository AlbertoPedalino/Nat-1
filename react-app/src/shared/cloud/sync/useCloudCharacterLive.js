import { useEffect, useId, useRef } from 'react';
import { useAuth } from '../auth/AuthProvider.jsx';
import { supabase } from '../supabaseClient.js';
import { getCloudCharacter } from '../api/cloudCharacters.js';
import { CHARACTER_ROW_EVENT } from './characterRows.js';

const CHARACTER_RECONCILE_MS = 30_000;

function channelSuffix(charId, instanceId) {
  return `${charId || 'character'}-${instanceId}`
    .replace(/[^a-z0-9_-]/gi, '_')
    .slice(0, 90);
}

export function useCloudCharacterLive({ charId, enabled = true, onUpdate, refreshKey } = {}) {
  const { cloudEnabled, status, user } = useAuth();
  const instanceId = useId();
  const onUpdateRef = useRef(onUpdate);
  const lastRow = useRef({ id: null, revision: -1 });

  onUpdateRef.current = onUpdate;

  useEffect(() => {
    const id = charId ? String(charId) : '';
    if (!enabled || !id || !cloudEnabled || status !== 'authed' || !user?.id || !supabase) {
      return undefined;
    }

    let alive = true;
    let refreshRequest = 0;
    let newestCommitTime = 0;
    let realtimeRevision = 0;
    if (lastRow.current.id !== id) lastRow.current = { id, revision: -1 };

    const isCharacterRow = (row) => (
      alive && row && String(row.id || '') === id && row.data && typeof row.data === 'object'
    );

    const deliverRow = (row) => {
      try {
        if (!isCharacterRow(row)) return;
        if (row.row_revision != null) {
          if (Number(row.row_revision) < lastRow.current.revision) return;
          lastRow.current.revision = Number(row.row_revision);
        }
        onUpdateRef.current?.(row);
      } catch (_) {
        // Realtime is opportunistic; bad payloads should not break sheet viewing.
      }
    };

    const handlePayload = (payload) => {
      if (!isCharacterRow(payload?.new)) return;
      // Sheet saves stamp updated_at in the browser, but encounter patches use
      // the database clock. Only commit_timestamp can order both reliably.
      const commitTime = Date.parse(payload.commit_timestamp || '');
      if (Number.isFinite(commitTime) && commitTime < newestCommitTime) return;
      if (Number.isFinite(commitTime)) newestCommitTime = commitTime;
      realtimeRevision += 1;
      deliverRow(payload.new);
    };

    // Postgres changes are not replayed after a sleeping phone or a brief
    // network loss. Re-read the authoritative row on every recovery boundary,
    // and periodically while the sheet remains open.
    const refresh = async () => {
      const request = ++refreshRequest;
      const revisionAtStart = realtimeRevision;
      try {
        const row = await getCloudCharacter(id);
        // A fresh read is authoritative even when updated_at went backwards.
        // Discard it if a realtime update arrived while the read was in flight.
        if (alive && request === refreshRequest && revisionAtStart === realtimeRevision) deliverRow(row);
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
    const receiveCommand = ({ detail }) => {
      if (!isCharacterRow(detail)) return;
      realtimeRevision += 1;
      deliverRow(detail);
    };
    window.addEventListener(CHARACTER_ROW_EVENT, receiveCommand);
    window.addEventListener('online', refresh);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refreshWhenVisible);

    return () => {
      alive = false;
      refreshRequest += 1;
      window.clearInterval(timer);
      window.removeEventListener(CHARACTER_ROW_EVENT, receiveCommand);
      window.removeEventListener('online', refresh);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
      try {
        supabase.removeChannel(channel);
      } catch (_) {
        // Cleanup remains fail-soft if the socket was already closed.
      }
    };
  }, [charId, enabled, cloudEnabled, status, user?.id, instanceId, refreshKey]);
}
