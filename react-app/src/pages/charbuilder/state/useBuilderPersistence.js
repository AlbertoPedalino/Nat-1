import { useEffect, useRef, useState } from 'react';
import { isSyncExcluded } from '../../../shared/cloud/sync/cloudSyncExclude.js';
import { saveCharacter, buildSheetCharacter } from './persistence.js';
import { saveBuilderCharacter } from './cloudSave.js';
import { ensureActiveCharacter } from './builderStartup.js';
import { createDraftHandlers } from './builderDraftHandlers.js';
import { useAuth } from '../../../shared/cloud/auth/AuthProvider.jsx';
import { getCloudCharacter, getCloudSheetRevision } from '../../../shared/cloud/api/cloudCharacters.js';
import { useCharacterCloudSave } from '../../../shared/cloud/sync/useCharacterCloudSave.js';
import { CHARACTER_SHEET_SAVED_EVENT } from '../../../shared/cloud/sync/characterEvents.js';
import {
  generateCharId,
  getActiveCharId,
  rebaseCharacterSync,
} from '../../../shared/character/profile/store.js';
import { useEventListener } from '../../../shared/ui/useEventListener.js';
import { characterIdFromUrl, replaceCharacterIdInUrl } from '../../../shared/character/profile/characterRoutes.js';

function hasFinishedLoading(loading) {
  return !Object.values(loading || {}).some(Boolean);
}

// Where the builder's character lives and how it gets there: the initial pull
// (cloud or local store), autosave, the conflict a refused cloud save raises,
// and the explicit import / save-local / upload actions.
export function useBuilderPersistence({ state, dispatch, notify }) {
  const { cloudEnabled, status } = useAuth();
  // When logged into the cloud the builder is cloud-backed: the character is
  // created/saved on the server and never written to localStorage. Logged out,
  // it falls back to the local store. 'loading' = auth not resolved yet — wait.
  const authResolved = !cloudEnabled || status !== 'loading';
  const cloudActive = cloudEnabled && status === 'authed';
  const hydratedRef = useRef(false);   // initial load (cloud pull / local) done
  const builderIdRef = useRef(null);   // cloud character id for this session
  const cloudCreatedRef = useRef(false); // cloud row already inserted
  const cloudPrevRef = useRef(null);   // last persisted cloud object (merge base)
  // The sheet_revision the builder's copy is based on. Every save of an
  // existing row is conditional on it; a change made elsewhere since (the GM
  // adds an item) is a conflict the user resolves, never overwritten.
  const sheetRevisionRef = useRef(null);
  const [cloudConflict, setCloudConflict] = useState(null);
  const cloudConflictRef = useRef(null);

  // The one way the builder writes the cloud (saveBuilderCharacter): created
  // once, then only conditional updates. The revision a save produces becomes
  // the one held.
  const commitCloudSave = async (id, character) => {
    const result = await saveBuilderCharacter({
      id, character, created: cloudCreatedRef.current, knownRevision: sheetRevisionRef.current,
    });
    cloudCreatedRef.current = true;
    cloudPrevRef.current = character;
    sheetRevisionRef.current = result.sheetRevision;
    return result;
  };

  // Saves run one at a time (useCharacterCloudSave): one requested while
  // another is on its way waits for it, then writes the builder's state as it
  // is by then, against the revision (or the row) the previous save produced.
  // A refused save pauses cloud autosave until the user decides; a failed one
  // is reported once and retried on the recovery triggers.
  const cloudSnapshotRef = useRef(null);
  cloudSnapshotRef.current = () => buildSheetCharacter(state.character, state.data, cloudPrevRef.current || {});
  const cloudSave = useCharacterCloudSave({
    enabled: cloudActive,
    save: async () => {
      // A refused save waits for the user's decision; so does everything queued behind it.
      if (cloudConflictRef.current) return null;
      const id = builderIdRef.current;
      if (!id) return null;
      return commitCloudSave(id, { ...cloudSnapshotRef.current(), id });
    },
    onConflict: (error) => {
      cloudConflictRef.current = error;
      setCloudConflict(error);
    },
    onError: (error) => notify('error', `Cloud save error: ${error?.message || error}`),
  });

  // "Load updated version": the builder takes the cloud character.
  const loadCloudVersion = async () => {
    const id = builderIdRef.current;
    if (!id) return;
    try {
      const row = await getCloudCharacter(id, { reason: 'conflict-refresh' });
      cloudCreatedRef.current = true;
      cloudPrevRef.current = row.data;
      sheetRevisionRef.current = row.sheet_revision ?? null;
      cloudConflictRef.current = null;
      setCloudConflict(null);
      dispatch({ type: 'character/restore', character: row.data });
    } catch (error) {
      notify('error', `Cloud load error: ${error?.message || error}`);
    }
  };

  // "Keep my changes": an explicit save over the current cloud version, still
  // conditional on it (the resumed autosave does it).
  const keepBuilderVersion = async () => {
    const id = builderIdRef.current;
    if (!id) return;
    try {
      const revision = cloudConflictRef.current?.remoteSheetRevision ?? await getCloudSheetRevision(id);
      if (revision == null) {
        notify('error', 'This character no longer exists in the cloud.');
        return;
      }
      sheetRevisionRef.current = revision;
      cloudCreatedRef.current = true;
      cloudConflictRef.current = null;
      setCloudConflict(null);
    } catch (error) {
      notify('error', `Cloud error: ${error?.message || error}`);
    }
  };

  // A save of this character made elsewhere in this tab (e.g. the autosync
  // push of a "Save local" copy) is ours: its revision becomes the one held.
  useEventListener(window, CHARACTER_SHEET_SAVED_EVENT, ({ detail }) => {
    if (String(detail?.characterId ?? '') !== String(builderIdRef.current ?? '')) return;
    if (sheetRevisionRef.current == null || detail.sheetRevision > sheetRevisionRef.current) {
      sheetRevisionRef.current = detail.sheetRevision;
    }
  });
  // An imported JSON is a DRAFT: held in builder state, persisted NOWHERE (no
  // localStorage, no cloud) until the user explicitly saves it from the Sheet
  // step. While true the autosave effect is suppressed. Applies on/offline.
  const [importDraft, setImportDraft] = useState(false);

  const draftHandlers = createDraftHandlers({
    refs: { builderIdRef, cloudCreatedRef, cloudPrevRef, sheetRevisionRef },
    cloudSave,
    cloudActive,
    character: state.character,
    setImportDraft,
    dispatch,
    notify,
  });

  useEffect(() => {
    if (!authResolved || hydratedRef.current) return;
    const charParam = characterIdFromUrl();
    const excluded = charParam && charParam !== 'new' && isSyncExcluded(charParam);

    if (!cloudActive || excluded) {
      // Logged out, or an imported sheet flagged local-only: keep the local-store
      // flow (the reducer already loaded any local copy; point the active id at it).
      ensureActiveCharacter();
      hydratedRef.current = true;
      return;
    }

    // Cloud-backed: an existing ?char=id is pulled from the server into builder
    // state (nothing is read from localStorage). A new builder creates its cloud
    // row on the first autosave below.
    if (charParam && charParam !== 'new') {
      getCloudCharacter(charParam)
        .then((row) => {
          builderIdRef.current = charParam;
          if (row?.data) {
            cloudCreatedRef.current = true;
            cloudPrevRef.current = row.data;
            sheetRevisionRef.current = row.sheet_revision ?? null;
            dispatch({ type: 'character/restore', character: row.data });
          }
        })
        .catch(() => { builderIdRef.current = charParam; })
        .finally(() => { hydratedRef.current = true; });
    } else {
      builderIdRef.current = null;
      hydratedRef.current = true;
    }
  }, [authResolved, cloudActive]);

  // Runs after the initial pull above within the same commit, so a new cloud
  // builder (hydrated synchronously) is not skipped on its first pass.
  useEffect(() => {
    if (!hasFinishedLoading(state.loading) || !authResolved) return;
    // Cloud mode must wait for the initial pull, or a blank builder state would
    // overwrite the real server character before it loads.
    if (cloudActive && !hydratedRef.current) return;
    // A pending online import draft is persisted nowhere until the user uploads it.
    if (importDraft) return;
    // A refused save waits for the user's decision (the conflict banner).
    if (cloudConflict) return;

    const handle = setTimeout(() => {
      const activeId = builderIdRef.current || getActiveCharId();
      // Imported sheets stay local even when logged in; everything else goes to
      // the server only.
      const useCloud = cloudActive && !(activeId && isSyncExcluded(activeId));

      if (useCloud) {
        // Save straight to the server on open (no need to "Open sheet" first) and
        // on every edit — never touching localStorage. The first save inserts the
        // row; later saves update it in place, one at a time.
        if (!builderIdRef.current) {
          builderIdRef.current = generateCharId();
          // Point the URL at the new id so a reload/edit targets the same character.
          replaceCharacterIdInUrl(builderIdRef.current);
        }
        cloudSave.request();
        return;
      }

      // Logged out: persist to the local store as before.
      const hadId = getActiveCharId();
      const saved = saveCharacter(state.character, state.data, { createIfMissing: true });
      if (saved?.id && !hadId) {
        replaceCharacterIdInUrl(saved.id);
      }
    }, cloudActive ? 1200 : 300);
    return () => clearTimeout(handle);
    // cloudSave.request is stable and reads refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.character, state.loading, state.data, authResolved, cloudActive, importDraft, cloudConflict]);

  // A cloud character saved as a local copy: the copy is in sync with the
  // revision the builder holds.
  const handleCloudCopySavedLocally = (id) => {
    if (id === builderIdRef.current) rebaseCharacterSync(id, sheetRevisionRef.current);
  };

  return {
    cloudActive,
    cloudConflict,
    importDraft,
    loadCloudVersion,
    keepBuilderVersion,
    handleCloudCopySavedLocally,
    ...draftHandlers,
  };
}
