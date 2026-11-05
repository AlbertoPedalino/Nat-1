import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getCloudCharacter,
  SHEET_CONFLICT,
  updateCloudCharacterData,
} from '../../../shared/cloud/api/cloudCharacters.js';
import { useCharacterSheetRevision } from '../../../shared/cloud/sync/useCharacterSheetRevision.js';
import { CLOUD_SYNC_EVENT, isCloudSyncBusy } from '../../../shared/cloud/sync/cloudSyncState.js';
import { isSyncExcluded } from '../../../shared/cloud/sync/cloudSyncExclude.js';
import {
  hasUnsyncedLocalChanges,
  markCharacterSynced,
  patchCharacter as storePatchCharacter,
  rebaseCharacterSync,
  saveCharacter as storeSaveCharacter,
} from '../../../shared/character/profile/store.js';

const CLOUD_SAVE_DELAY_MS = 1_200;
const CLOUD_RETRY_MS = 30_000;

// The sheet's content sync with the cloud:
//   - a cloud sheet (`usesExternalChar`) saves its own edits, debounced and
//     conditional on the revision it is based on, retried on online / focus /
//     visibility and every 30 s; a local sheet's pushes run in CloudAutoSync;
//   - both follow the row's revision and take a newer copy when clean, or hold
//     a conflict for the user (load the cloud's version / keep my changes).
// The sheet calls `noteLocalEdit` for every own edit (not for vitals received
// from the cloud) and `resetCloudSave` whenever it loads a new copy;
// `reloadKey` moves when a local sheet stored the cloud's copy and must reload.
export function useSheetCloudSave({
  C, charId, healthId, usesExternalChar, readOnly, onSheetRow, onSheetDeleted, sheetBaseRevision, showNotice,
}) {
  const cloudSaveReadyRef = useRef(false);
  const pendingCloudSaveRef = useRef(null);
  const cloudSaveInFlightRef = useRef(null);
  const cloudSaveTimerRef = useRef(null);
  const flushCloudSaveRef = useRef(null);
  const cloudSaveMountedRef = useRef(true);
  const cloudSaveErrorShownRef = useRef(false);
  const localEditVersionRef = useRef(0);
  const queuedEditVersionRef = useRef(0);
  const [reloadKey, setReloadKey] = useState(0);
  const [sheetConflict, setSheetConflict] = useState(null);
  const sheetConflictRef = useRef(null);

  const noteLocalEdit = useCallback(() => {
    localEditVersionRef.current += 1;
  }, []);

  const resetCloudSave = useCallback(() => {
    cloudSaveReadyRef.current = false;
    pendingCloudSaveRef.current = null;
    localEditVersionRef.current = 0;
    queuedEditVersionRef.current = 0;
    cloudSaveErrorShownRef.current = false;
    clearTimeout(cloudSaveTimerRef.current);
    cloudSaveTimerRef.current = null;
  }, []);

  // Content changed elsewhere (a GM adds an item, another device levels up).
  // The sheet follows its revision — a few bytes, never with hit points — and
  // downloads itself only when that moved past the one it holds. A clean sheet
  // takes the new row: a cloud sheet through its parent (`onSheetRow`), a local
  // one by storing it as the cloud's copy (no push back) and reloading. A sheet
  // with local changes pending never takes it silently: its own save is
  // conditional on the revision it is based on, and a real conflict waits for
  // the user.
  const sheetSyncProps = useRef({});
  sheetSyncProps.current = { usesExternalChar, readOnly, healthId, onSheetRow, onSheetDeleted, C };
  const sheetBusy = useCallback(() => {
    const { usesExternalChar: external, readOnly: viewOnly, healthId: id } = sheetSyncProps.current;
    if (sheetConflictRef.current) return true;
    if (viewOnly) return false;
    if (external) return Boolean(pendingCloudSaveRef.current || cloudSaveInFlightRef.current);
    return isCloudSyncBusy(id) || hasUnsyncedLocalChanges(id);
  }, []);

  const applyRemoteSheet = useCallback((row) => {
    const { usesExternalChar: external, healthId: id, onSheetRow: toParent } = sheetSyncProps.current;
    if (!row?.data || String(row.id ?? '') !== String(id)) return;
    if (external) {
      toParent?.(row);
      return;
    }
    storeSaveCharacter(id, row.data, { emit: false });
    markCharacterSynced(id, row.sheet_revision ?? null);
    setReloadKey((key) => key + 1);
  }, []);

  const enterSheetConflict = useCallback((row) => {
    if (!row?.data) return;
    sheetConflictRef.current = row;
    setSheetConflict(row);
  }, []);

  const refreshForConflict = useCallback(async () => {
    const { healthId: id } = sheetSyncProps.current;
    try {
      enterSheetConflict(await getCloudCharacter(id, { reason: 'conflict-refresh' }));
    } catch (_) {
      // Unreachable now: the pending save stays pending and fails again later.
    }
  }, [enterSheetConflict]);

  const sheetSync = useCharacterSheetRevision({
    characterId: healthId,
    enabled: Boolean(healthId) && !isSyncExcluded(healthId),
    baseRevision: sheetBaseRevision,
    isBusy: sheetBusy,
    onNewer: async () => {
      const { healthId: id } = sheetSyncProps.current;
      const row = await getCloudCharacter(id, { reason: 'structural-refresh' });
      // Edited while the sheet was downloading: that is a conflict too.
      if (sheetBusy()) enterSheetConflict(row);
      else applyRemoteSheet(row);
    },
    onDeleted: () => { sheetSyncProps.current.onSheetDeleted?.(); },
  });

  // A local sheet's pushes run in CloudAutoSync: learn when one settles or
  // finds the cloud moved on.
  useEffect(() => {
    if (usesExternalChar || !healthId) return undefined;
    const onSync = ({ detail }) => {
      if (String(detail?.id ?? '') !== String(healthId)) return;
      if (detail.state === 'conflict') {
        if (!sheetConflictRef.current) refreshForConflict();
      } else if (detail.state === 'synced' || detail.state === 'cancelled' || detail.state === 'error') {
        sheetSync.settle();
      }
    };
    window.addEventListener(CLOUD_SYNC_EVENT, onSync);
    return () => window.removeEventListener(CLOUD_SYNC_EVENT, onSync);
  }, [usesExternalChar, healthId, refreshForConflict, sheetSync]);

  // "Load the updated version": local changes are dropped for the cloud's.
  const loadRemoteVersion = useCallback(() => {
    const row = sheetConflictRef.current;
    if (!row) return;
    sheetConflictRef.current = null;
    setSheetConflict(null);
    pendingCloudSaveRef.current = null;
    clearTimeout(cloudSaveTimerRef.current);
    applyRemoteSheet(row);
  }, [applyRemoteSheet]);

  // "Keep my changes": an explicit save over that cloud version, still
  // conditional on it (a change made after it is another conflict).
  const keepLocalVersion = useCallback(() => {
    const row = sheetConflictRef.current;
    if (!row) return;
    const { usesExternalChar: external, healthId: id, C: current } = sheetSyncProps.current;
    sheetConflictRef.current = null;
    setSheetConflict(null);
    sheetSync.noteSaved(row.sheet_revision);
    if (external) {
      if (!pendingCloudSaveRef.current && current) pendingCloudSaveRef.current = { charId: id, character: current };
      flushCloudSaveRef.current?.();
    } else {
      rebaseCharacterSync(id, row.sheet_revision);
      storePatchCharacter(id, {});
    }
  }, [sheetSync]);

  const scheduleCloudSave = useCallback((delay = CLOUD_SAVE_DELAY_MS) => {
    clearTimeout(cloudSaveTimerRef.current);
    cloudSaveTimerRef.current = setTimeout(() => flushCloudSaveRef.current?.(), delay);
  }, []);

  const flushCloudSave = useCallback(async () => {
    const attempt = pendingCloudSaveRef.current;
    // A conflict waits for the user's decision; nothing is saved meanwhile.
    if (!attempt || cloudSaveInFlightRef.current || sheetConflictRef.current) return;
    cloudSaveInFlightRef.current = attempt;
    try {
      // Conditional on the revision this sheet is based on: a change made
      // elsewhere since is reported, never overwritten.
      const known = sheetSync.knownRevision();
      const result = await updateCloudCharacterData(attempt.charId, attempt.character, {
        expectedSheetRevision: known >= 0 ? known : null,
      });
      if (pendingCloudSaveRef.current === attempt) {
        pendingCloudSaveRef.current = null;
      }
      cloudSaveErrorShownRef.current = false;
      // Our own revision: its Realtime echo is not someone else's change.
      sheetSync.noteSaved(result?.sheetRevision);
    } catch (error) {
      if (error?.code === SHEET_CONFLICT) {
        refreshForConflict();
      } else if (!cloudSaveErrorShownRef.current) {
        cloudSaveErrorShownRef.current = true;
        showNotice('Cloud Save', error?.message || 'Failed to save online sheet.');
      }
      // Keep the exact snapshot pending. Online/focus/visibility and the
      // 30-second safety timer below will retry it.
    } finally {
      cloudSaveInFlightRef.current = null;
      if (
        cloudSaveMountedRef.current
        && pendingCloudSaveRef.current
        && pendingCloudSaveRef.current !== attempt
      ) {
        scheduleCloudSave();
      }
    }
  }, [refreshForConflict, scheduleCloudSave, sheetSync, showNotice]);
  flushCloudSaveRef.current = flushCloudSave;

  useEffect(() => {
    if (!usesExternalChar || readOnly || !charId || !C) return undefined;
    if (!cloudSaveReadyRef.current) {
      cloudSaveReadyRef.current = true;
      return undefined;
    }
    // Receiving vitals changes C too, but is not a new local edit. Writing it
    // back creates another realtime event and can bounce old HP between peers.
    // A queued local edit still needs the merged vitals in its next snapshot.
    if (localEditVersionRef.current === queuedEditVersionRef.current) {
      if (pendingCloudSaveRef.current && pendingCloudSaveRef.current !== cloudSaveInFlightRef.current) {
        pendingCloudSaveRef.current = { ...pendingCloudSaveRef.current, character: C };
      }
      return undefined;
    }
    queuedEditVersionRef.current = localEditVersionRef.current;
    pendingCloudSaveRef.current = {
      charId,
      character: C,
    };
    cloudSaveErrorShownRef.current = false;
    scheduleCloudSave();
    return undefined;
  }, [usesExternalChar, readOnly, charId, C, scheduleCloudSave]);

  useEffect(() => {
    if (!usesExternalChar || readOnly) return undefined;
    const retry = () => flushCloudSaveRef.current?.();
    const retryWhenVisible = () => {
      if (document.visibilityState === 'visible') retry();
    };
    const timer = window.setInterval(retry, CLOUD_RETRY_MS);
    window.addEventListener('online', retry);
    window.addEventListener('focus', retry);
    document.addEventListener('visibilitychange', retryWhenVisible);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('online', retry);
      window.removeEventListener('focus', retry);
      document.removeEventListener('visibilitychange', retryWhenVisible);
    };
  }, [readOnly, usesExternalChar]);

  useEffect(() => {
    cloudSaveMountedRef.current = true;
    return () => {
      cloudSaveMountedRef.current = false;
      clearTimeout(cloudSaveTimerRef.current);
    };
  }, []);

  return { sheetConflict, loadRemoteVersion, keepLocalVersion, noteLocalEdit, resetCloudSave, reloadKey };
}
