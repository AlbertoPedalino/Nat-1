import { useEffect, useRef } from 'react';
import { useAuth } from './AuthProvider.jsx';
import { pushCharacter, updateForeignCharacter, deleteOwnCloudCharacter } from './cloudCharacters.js';
import { isSyncExcluded } from './cloudSyncExclude.js';
import { isForeignEdit } from './cloudForeign.js';

const DEBOUNCE_MS = 1200;

function emit(id, state, error) {
  try {
    window.dispatchEvent(new CustomEvent('gb:cloud-sync', { detail: { id, state, error } }));
  } catch (_) {}
}

// Headless: whenever logged in, every local character save is pushed to the
// cloud automatically (debounced). No opt-in — sync is always on.
export default function CloudAutoSync() {
  const { cloudEnabled, status } = useAuth();
  const timers = useRef({});
  const blocked = useRef(new Set()); // ids we can't write (e.g. GM viewing a player's sheet)
  const activeRef = useRef(false);
  activeRef.current = cloudEnabled && status === 'authed';

  useEffect(() => {
    if (!cloudEnabled) return undefined;
    const onSaved = (e) => {
      const id = e?.detail?.id;
      if (!id || !activeRef.current || blocked.current.has(id) || isSyncExcluded(id)) return;
      clearTimeout(timers.current[id]);
      timers.current[id] = setTimeout(async () => {
        emit(id, 'syncing');
        try {
          // Foreign sheets (a GM editing someone else's) update data only; own
          // sheets upsert the full row.
          if (isForeignEdit(id)) await updateForeignCharacter(id);
          else await pushCharacter(id);
          emit(id, 'synced');
        } catch (err) {
          const msg = String(err?.message || err);
          // Permission error = not our row (GM viewing a player's sheet). Stop
          // retrying it this session so we don't spam failed uploads.
          if (/row-level security|policy|owner|permission|denied|not authentic/i.test(msg)) {
            blocked.current.add(id);
          }
          emit(id, 'error', msg);
        }
      }, DEBOUNCE_MS);
    };

    const onDeleted = (e) => {
      const id = e?.detail?.id;
      if (!id || !activeRef.current) return;
      clearTimeout(timers.current[id]);
      // Owner-scoped: removing locally also removes the player's own cloud copy.
      deleteOwnCloudCharacter(id).catch(() => {});
    };

    const timersSnapshot = timers.current;
    window.addEventListener('gb:char-saved', onSaved);
    window.addEventListener('gb:char-deleted', onDeleted);
    const onForeignChanged = (e) => {
      const id = e?.detail?.id;
      if (id && e?.detail?.foreign) blocked.current.delete(id);
    };
    window.addEventListener('gb:cloud-foreign-changed', onForeignChanged);
    return () => {
      window.removeEventListener('gb:char-saved', onSaved);
      window.removeEventListener('gb:char-deleted', onDeleted);
      window.removeEventListener('gb:cloud-foreign-changed', onForeignChanged);
      Object.values(timersSnapshot).forEach(clearTimeout);
    };
  }, [cloudEnabled]);

  return null;
}
