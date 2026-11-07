import { useCallback, useEffect, useId, useMemo, useRef } from 'react';
import { useAuth } from '../auth/AuthProvider.jsx';
import { supabase } from '../supabaseClient.js';
import { openRealtimeChannel } from '../realtimeChannel.js';
import { getCloudSheetRevision } from '../api/cloudCharacters.js';
import { CHARACTER_SHEET_SAVED_EVENT } from './characterEvents.js';
import { listenForRecovery } from './recoveryTriggers.js';

// Whether the whole sheet this view holds is still the cloud's.
//
// Follows one character's row in `character_sheet_revisions`
// (17_character_sheet_revisions.sql): a few bytes that change only when the
// sheet's content does — never with hit points, which the character digest
// carries. Nothing here downloads a sheet: when the cloud's `sheet_revision`
// moves past the one this view holds, `onNewer(revision)` is called once and
// the view decides (download and apply, or report a conflict).
//
//   - `baseRevision`: the revision of the sheet the view has loaded or applied;
//     null while nothing is loaded (nothing is followed until it is), -1 when
//     the view holds a sheet of unknown revision.
//   - `isBusy()`: the view has local changes pending or in flight. A newer
//     revision seen then is held until the view calls `settle()` or its next
//     save lands, so the own echo of that save is recognised first.
//   - `onNewer(revision)`: may return a promise; while it runs, further
//     revisions are held and considered after.
//   - `onDeleted()`: the character is gone (Realtime DELETE or a recovery read
//     finding nothing).
//
// Own saves: every whole-sheet save of this tab announces the revision it
// produced (CHARACTER_SHEET_SAVED_EVENT), and `noteSaved(revision)` does the
// same for a caller that saved itself. That revision becomes known, so its
// Realtime echo — even one that arrives before the save's own answer, while
// the view is busy — is ignored.
//
// Recovery, for an event Realtime lost: one light read of the revision on
// SUBSCRIBED (first join and every reconnect) and on the shared recovery
// triggers (back online, back to the tab, every RECOVERY_INTERVAL_MS while
// shown).

export function useCharacterSheetRevision({
  characterId,
  enabled = true,
  baseRevision = null,
  isBusy = null,
  onNewer = null,
  onDeleted = null,
} = {}) {
  const id = characterId ? String(characterId) : '';
  const { user, cloudActive } = useAuth();
  const instanceId = useId();
  const known = useRef(-1);
  const held = useRef(-1);
  // The newest revision onNewer was already called for: the same change seen
  // twice (Realtime and a recovery read) is downloaded once. Forgotten if that
  // download failed, so the next trigger retries it.
  const requested = useRef(-1);
  const running = useRef(false);
  const callbacks = useRef({});
  callbacks.current = { isBusy, onNewer, onDeleted };

  const busy = () => running.current || Boolean(callbacks.current.isBusy?.());

  // Act on the newest revision held, if it is still newer than the one known.
  const settle = useCallback(() => {
    if (held.current <= Math.max(known.current, requested.current)) { held.current = -1; return; }
    if (busy()) return;
    const revision = held.current;
    held.current = -1;
    requested.current = revision;
    const result = callbacks.current.onNewer?.(revision);
    if (result && typeof result.then === 'function') {
      running.current = true;
      Promise.resolve(result)
        .catch(() => { if (requested.current === revision) requested.current = known.current; })
        .finally(() => {
          running.current = false;
          settle();
        });
    }
  }, []);

  const consider = useCallback((revision) => {
    const value = Number(revision);
    if (revision == null || !Number.isFinite(value) || value <= known.current) return;
    held.current = Math.max(held.current, value);
    settle();
  }, [settle]);

  const noteSaved = useCallback((revision) => {
    const value = Number(revision);
    if (revision != null && Number.isFinite(value)) known.current = Math.max(known.current, value);
    settle();
  }, [settle]);

  const knownRevision = useCallback(() => known.current, []);

  // The view loaded or applied a sheet: that is the revision it holds now.
  useEffect(() => {
    if (baseRevision == null) return;
    known.current = Number(baseRevision);
    requested.current = Math.min(requested.current, known.current);
    settle();
  }, [baseRevision, settle]);

  const ready = Boolean(enabled && id && baseRevision != null && cloudActive && user?.id && supabase);

  useEffect(() => {
    if (!ready) return undefined;
    let alive = true;
    let checking = false;
    let again = false;

    const deleted = () => {
      known.current = -1;
      held.current = -1;
      requested.current = -1;
      callbacks.current.onDeleted?.();
    };

    const check = async () => {
      if (!alive) return;
      if (checking) { again = true; return; }
      checking = true;
      try {
        const revision = await getCloudSheetRevision(id);
        if (!alive) return;
        if (revision == null) deleted();
        else consider(revision);
      } catch (_) {
        // The next recovery trigger reads again.
      } finally {
        checking = false;
        if (again && alive) { again = false; check(); }
      }
    };

    const channel = openRealtimeChannel(`gb-character-sheet-${id}-${instanceId}`, {
      changes: [{
        table: 'character_sheet_revisions',
        filter: `character_id=eq.${id}`,
        onChange: (payload) => {
          const type = String(payload?.eventType || '').toUpperCase();
          if (type === 'DELETE') {
            if (String(payload?.old?.character_id ?? id) === id) deleted();
            return;
          }
          if (String(payload?.new?.character_id ?? '') === id) consider(payload.new.sheet_revision);
        },
      }],
      onStatus: (state) => { if (state === 'SUBSCRIBED') check(); },
    });

    const receiveSaved = ({ detail }) => {
      if (String(detail?.characterId ?? '') === id) noteSaved(detail.sheetRevision);
    };
    window.addEventListener(CHARACTER_SHEET_SAVED_EVENT, receiveSaved);
    const stopRecovery = listenForRecovery(() => check(), { periodic: true });
    return () => {
      alive = false;
      window.removeEventListener(CHARACTER_SHEET_SAVED_EVENT, receiveSaved);
      stopRecovery();
      channel?.close();
    };
  }, [ready, id, instanceId, consider, noteSaved]);

  return useMemo(() => ({ knownRevision, noteSaved, settle }), [knownRevision, noteSaved, settle]);
}
