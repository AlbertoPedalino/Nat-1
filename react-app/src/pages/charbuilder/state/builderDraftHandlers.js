import { excludeFromSync, includeInSync } from '../../../shared/cloud/sync/cloudSyncExclude.js';
import { deleteOwnCloudCharacter } from '../../../shared/cloud/api/cloudCharacters.js';
import { generateCharId } from '../../../shared/character/profile/store.js';
import { confirmAction } from '../../../shared/ui/confirmAction.js';
import { NEW_CHARACTER, replaceCharacterIdInUrl } from '../../../shared/character/profile/characterRoutes.js';
import { extractSheetData, buildImportedCharacter } from './sheetImport.js';

// The builder's explicit persistence actions: importing a JSON sheet as a
// draft, then saving that draft locally or uploading it. `refs` are the cloud
// session refs useBuilderPersistence owns; they are reset here as each action
// changes which record the builder writes to.
export function createDraftHandlers({
  refs, cloudSave, cloudActive, character, setImportDraft, dispatch, notify,
}) {
  const { builderIdRef, cloudCreatedRef, cloudPrevRef, sheetRevisionRef } = refs;

  // Explicit "Upload to cloud" (SheetStep button). Pushes the current builder
  // character to the server and resumes normal cloud autosave. Reuses the session
  // cloud id so it upserts in place instead of spawning a duplicate row. Returns
  // the cloud id (for callers that then open the cloud sheet).
  const handleUploadToCloud = async () => {
    const id = builderIdRef.current || generateCharId();
    builderIdRef.current = id;
    // Through the same queue as autosave: never alongside another save. A
    // failure is reported (and retried) by the queue.
    const result = await cloudSave.request();
    if (!result) return null;
    includeInSync(id);
    setImportDraft(false);
    replaceCharacterIdInUrl(id);
    notify('success', 'Uploaded to cloud.');
    return id;
  };

  // After an explicit "Save local" of an imported draft: keep it local-only
  // (excluded from cloud sync) and resume autosave, which now targets the store.
  const handleDraftLocalSaved = (id) => {
    if (!id) return;
    excludeFromSync(id);
    builderIdRef.current = id;
    cloudCreatedRef.current = false;
    cloudPrevRef.current = null;
    sheetRevisionRef.current = null;
    setImportDraft(false);
    replaceCharacterIdInUrl(id);
  };

  const handleImportSheetFile = async (file) => {
    try {
      const payload = extractSheetData(await file.text());
      // Importing a JSON NEVER persists by itself — online or offline. It loads the
      // sheet into the builder as a DRAFT; the user persists it explicitly from the
      // Sheet step ("Save local" or "Upload to cloud"). So nothing is written to
      // localStorage and nothing is pushed to the cloud here.
      const imported = buildImportedCharacter(payload);
      const cur = character;
      const hasExisting = cur && (cur.className || (cur.name || '').trim());
      if (hasExisting && !confirmAction('A character is already open in the builder. Replace it with the imported sheet?')) {
        notify('info', 'Import cancelled.');
        return;
      }
      // Drop the blank cloud placeholder auto-created on open so it never lingers
      // as an empty orphan in the account.
      if (cloudActive && builderIdRef.current && cloudCreatedRef.current) {
        const prev = cloudPrevRef.current;
        const isEmptyPlaceholder = !prev || (!prev.className && !(prev.name || '').trim());
        if (isEmptyPlaceholder) { try { await deleteOwnCloudCharacter(builderIdRef.current); } catch (_) {} }
      }
      builderIdRef.current = null;
      cloudCreatedRef.current = false;
      cloudPrevRef.current = null;
      sheetRevisionRef.current = null;
      setImportDraft(true);
      dispatch({ type: 'character/restore', character: imported });
      replaceCharacterIdInUrl(NEW_CHARACTER);
      notify('success', 'Imported. Save local or upload to cloud from the Sheet step.');
    } catch (error) {
      notify('error', `Import error: ${error?.message || error}`);
    }
  };

  return { handleUploadToCloud, handleDraftLocalSaved, handleImportSheetFile };
}
