import { useEffect, useId, useRef, useState } from 'react';
import { useAuth } from '../auth/AuthProvider.jsx';
import { supabase } from '../supabaseClient.js';
import { getCloudCharacter, getCloudCharacterRevision } from '../api/cloudCharacters.js';
import { CHARACTER_RECHECK_EVENT } from './characterEvents.js';
import { coalesceReturns } from './returnGate.js';

export const CHARACTER_CHECK_MS = 30_000;

// One whole `characters` row, for a view that shows the whole sheet.
//
// It is read once on mount. With `live` (a read-only viewer), it is then
// followed:
//   - Realtime UPDATEs of this id carry the new row;
//   - recovery — SUBSCRIBED (first join and every reconnect), coming back to
//     the tab, going online, and a 30 s safety tick — reads `row_revision`
//     only, and downloads the row again only when it moved past the one held.
//
// Rows are ordered by `row_revision` alone: the database moves it on every
// change and never on a write that changes nothing (13_character_vitals.sql),
// so a late read can never replace a newer realtime row, whatever the clocks.
//
// Editable sheets read the row once and do not follow it: all they take from
// others are vitals, which arrive in the character digest
// (useCharacterDigests), never as a whole sheet.

function channelSuffix(charId, instanceId) {
  return `${charId || 'character'}-${instanceId}`
    .replace(/[^a-z0-9_-]/gi, '_')
    .slice(0, 90);
}

function initialState(id) {
  return id ? { row: null, loading: true, error: '' } : { row: null, loading: false, error: 'No sheet id.' };
}

export function useCloudCharacterRow(charId, { live = false } = {}) {
  const id = charId ? String(charId) : '';
  const { cloudEnabled, status, user } = useAuth();
  const instanceId = useId();
  const [state, setState] = useState(() => initialState(id));
  // What the load and the live follower of the current id share: the revision
  // held, and whether the first read is still out.
  const session = useRef(null);

  useEffect(() => {
    const current = { id, revision: -1, loading: Boolean(id), afterLoad: null };
    session.current = current;
    setState(initialState(id));
    if (!id) return undefined;
    getCloudCharacter(id)
      .then((row) => acceptRow(session, current, row, setState))
      .catch((error) => {
        if (session.current !== current || current.revision >= 0) return;
        setState({ row: null, loading: false, error: error?.message || 'Failed to load sheet.' });
      })
      .finally(() => {
        current.loading = false;
        const next = current.afterLoad;
        current.afterLoad = null;
        next?.();
      });
    return () => {
      if (session.current === current) session.current = null;
    };
  }, [id]);

  useEffect(() => {
    const current = session.current;
    if (!live || !current?.id || !cloudEnabled || status !== 'authed' || !user?.id || !supabase) {
      return undefined;
    }

    let alive = true;
    let checking = false;
    let again = false;
    const deliver = (row) => { if (alive) acceptRow(session, current, row, setState); };

    const check = async () => {
      if (!alive) return;
      // The first read answers for now; one check after it covers the gap
      // between that read and the subscription going live.
      if (current.loading) { current.afterLoad = check; return; }
      if (checking) { again = true; return; }
      checking = true;
      try {
        const revision = await getCloudCharacterRevision(current.id);
        if (alive && revision != null && revision > current.revision) deliver(await getCloudCharacter(current.id));
      } catch (_) {
        // The next trigger retries.
      } finally {
        checking = false;
        if (again && alive) {
          again = false;
          check();
        }
      }
    };

    const receive = (payload) => {
      try {
        const row = payload?.new;
        if (!row || String(row.id ?? '') !== current.id) return;
        if (row.data && typeof row.data === 'object') deliver(row);
        // A payload Realtime trimmed still says whether there is anything to read.
        else if (Number(row.row_revision) > current.revision) check();
      } catch (_) {
        // Realtime is opportunistic; the next check repairs.
      }
    };

    let channel;
    try {
      channel = supabase.channel(`gb-character-row-${channelSuffix(current.id, instanceId)}`);
      channel.on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'characters',
        filter: `id=eq.${current.id}`,
      }, receive);
      channel.subscribe((state) => { if (state === 'SUBSCRIBED') check(); });
    } catch (_) {
      try { if (channel) supabase.removeChannel(channel); } catch (__) {}
      return undefined;
    }

    // Focus and visibilitychange arrive together when a tab comes back.
    const checkOnReturn = coalesceReturns(check);
    const checkWhenVisible = () => { if (document.visibilityState === 'visible') checkOnReturn(); };
    // A health command of this tab failed or timed out. Its answers are never
    // taken here: they carry vitals only, and this view shows a whole sheet,
    // which arrives through Realtime or the next check.
    const recheck = ({ detail }) => { if (String(detail?.characterId ?? '') === current.id) check(); };
    const timer = window.setInterval(check, CHARACTER_CHECK_MS);
    window.addEventListener(CHARACTER_RECHECK_EVENT, recheck);
    window.addEventListener('online', check);
    window.addEventListener('focus', checkOnReturn);
    document.addEventListener('visibilitychange', checkWhenVisible);

    return () => {
      alive = false;
      if (current.afterLoad === check) current.afterLoad = null;
      window.clearInterval(timer);
      window.removeEventListener(CHARACTER_RECHECK_EVENT, recheck);
      window.removeEventListener('online', check);
      window.removeEventListener('focus', checkOnReturn);
      document.removeEventListener('visibilitychange', checkWhenVisible);
      try { supabase.removeChannel(channel); } catch (_) {}
    };
  }, [live, cloudEnabled, status, user?.id, instanceId, id]);

  return state;
}

// Keep a row only if it belongs to the current id and is newer than the one held.
function acceptRow(session, current, row, setState) {
  if (session.current !== current) return;
  if (!row || String(row.id ?? '') !== current.id || !row.data || typeof row.data !== 'object') return;
  const revision = Number(row.row_revision ?? 0);
  if (!Number.isFinite(revision) || revision <= current.revision) return;
  current.revision = revision;
  setState({ row, loading: false, error: '' });
}
