import { useState, useEffect, useCallback, useRef } from 'react';
import { deriveSheetState } from '../../../shared/character/sheet/sheetState.js';
import { useSheetCloudSave } from './useSheetCloudSave.js';
import {
  initialSheetResources,
  loadSheetReferenceData,
  reconcileLoadedCharacter,
} from './sheetLoad.js';
import { commandCharacterVitals } from '../../../shared/cloud/api/healthCommands.js';
import { useCharacterDigests } from '../../../shared/cloud/sync/useCharacterDigests.js';
import { useAuth } from '../../../shared/cloud/auth/AuthProvider.jsx';
import { isSyncExcluded } from '../../../shared/cloud/sync/cloudSyncExclude.js';
import { withRuntimeOnlyCharacterFields } from '../../../shared/character/profile/runtimeFields.js';
import {
  SYNCED_VITALS,
  clampCharacterVitals,
  pickCharacterVitals,
} from '../../../shared/character/combat/vitals.js';
import {
  getActiveCharId,
  getCharacterSyncMeta,
  loadCharacter as storeLoadCharacter,
  patchCharacter as storePatchCharacter,
  setActiveCharId,
} from '../../../shared/character/profile/store.js';
import { characterIdFromUrl } from '../../../shared/character/profile/characterRoutes.js';
import { useToast } from '../../../shared/ui/ToastProvider.jsx';

function getCharIdFromUrl() {
  return characterIdFromUrl() || getActiveCharId();
}

// The sheet as a document: which character it is (an external row, or the
// one in the URL / last opened), loading it with its reference data,
// writing every edit (`persist`; vitals go out as health commands), the
// sheet state's own updates (`syncSheet`), following its vitals through
// the character digest, and the content's cloud save and conflict. The
// state lives in CharacterSheet; this hook reads and sets it.
export function useSheetDocument({
  externalChar, externalCharId, externalSheetRevision, onSheetRow, onSheetDeleted, readOnly, liveDigest,
  C, setC, sheet, setSheet, charId, setCharId, setResources, setFreeCastUses, setConditionEntries,
}) {
  const { notify } = useToast();
  const sheetRef = useRef(null);
  sheetRef.current = sheet;
  // The sheet revision of the loaded copy (content sync, useSheetCloudSave).
  const [sheetBaseRevision, setSheetBaseRevision] = useState(null);
  const usesExternalChar = Boolean(externalChar);
  const auth = useAuth();
  const hasCloudHealth = usesExternalChar || (auth.cloudEnabled && auth.status === 'authed');
  const sheetReady = Boolean(sheet);

  // An editable sheet is the author of everything but its vitals, which others
  // (the GM, the battle map, the encounter builder) change through health
  // commands. Those arrive in the character digest — the parent's when it
  // already follows one (`liveDigest`, e.g. the battle map roster), otherwise
  // this sheet's own — never as a whole row. Max HP is derived here from this
  // sheet, so no sheet is ever downloaded for it. A read-only sheet follows
  // them the same way (it just never writes).
  const healthId = usesExternalChar ? externalCharId : charId;
  const followsVitals = Boolean(healthId) && !isSyncExcluded(healthId);
  const { digests: ownDigests } = useCharacterDigests({
    characterIds: healthId ? [healthId] : null,
    enabled: followsVitals && liveDigest === undefined,
    deriveMaxHp: false,
  });
  const candidateDigest = liveDigest === undefined ? ownDigests.get(String(healthId)) : liveDigest;
  const incomingDigest = followsVitals && candidateDigest?.characterId === String(healthId) ? candidateDigest : null;
  const incomingDigestRef = useRef(null);
  incomingDigestRef.current = incomingDigest;

  const {
    sheetConflict, loadRemoteVersion, keepLocalVersion, noteLocalEdit, resetCloudSave, reloadKey,
  } = useSheetCloudSave({
    C, charId, healthId, usesExternalChar, readOnly, onSheetRow, onSheetDeleted, sheetBaseRevision,
  });

  useEffect(() => {
    let alive = true;
    resetCloudSave();
    // Read-only view feeds the character directly (from the cloud); skip local
    // store entirely so nothing is written and auto-sync stays silent.
    const id = externalChar ? externalCharId : getCharIdFromUrl();
    const ch = externalChar || (id ? storeLoadCharacter(id) : null);
    if (!externalChar && id && ch) setActiveCharId(id);
    // The sheet revision this copy is: the row's for a cloud sheet, the one the
    // local copy was last aligned with otherwise (-1: unknown).
    const loadedRevision = externalChar
      ? Number(externalSheetRevision ?? -1)
      : (id && ch ? (getCharacterSyncMeta(id).sheetRevision ?? -1) : null);

    loadSheetReferenceData(ch).then(({ itemsDb, optionalFeatures, conditionEntries: condEntries }) => {
      if (!alive) return;
      setConditionEntries(condEntries);

      const { character: nextChar, inventoryChanged } = reconcileLoadedCharacter(ch, itemsDb, optionalFeatures);
      // Only a real change is a local edit (and a push): opening a sheet
      // must not make an unchanged local copy look unsaved.
      if (!externalChar && id && inventoryChanged) {
        storePatchCharacter(id, { inventory: nextChar.inventory });
      }

      setCharId(id);
      setC(nextChar);
      setSheetBaseRevision(loadedRevision);
      if (nextChar) {
        setSheet(deriveSheetState(nextChar));
        const { resources: merged, changed } = initialSheetResources(nextChar);
        setResources(merged);
        if (!externalChar && id && changed) {
          storePatchCharacter(id, { resources: merged });
        }
        setFreeCastUses(nextChar.freeCastUses && typeof nextChar.freeCastUses === 'object' ? nextChar.freeCastUses : {});
      }
    });

    return () => { alive = false; };
    // externalSheetRevision changes with externalChar (a newer row).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalChar, externalCharId, reloadKey]);

  const persist = useCallback((patch, { fromCloud = false, command } = {}) => {
    if (!charId || !patch) return;
    const onlineVitals = !fromCloud && !isSyncExcluded(charId) && hasCloudHealth;
    if (onlineVitals && SYNCED_VITALS.some((field) => Object.hasOwn(patch, field.data))) {
      const vitalPatch = Object.fromEntries(SYNCED_VITALS.filter((f) => Object.hasOwn(patch, f.data)).map((f) => [f.data, patch[f.data]]));
      const confirmed = sheetRef.current;
      setSheet((prev) => ({ ...prev, ...pickCharacterVitals(confirmed), maxHP: confirmed.maxHP }));
      // Computed from the digest this sheet follows and the base max HP this
      // sheet derives (it is the author of its own structure), so nothing is
      // read first. The answer (applied or not) comes back through the digest.
      const digest = incomingDigestRef.current;
      const base = digest && confirmed
        ? { hpBasis: digest.hpBasis, baseMax: Math.max(1, (Number(confirmed.maxHP) || 1) - (Number(confirmed.maxHPBonus) || 0)) }
        : null;
      commandCharacterVitals(charId, command || { type: 'patch', patch: vitalPatch }, { digest, base })
        .catch((error) => notify('error', `Could not update hit points: ${error.message}`));
      patch = Object.fromEntries(Object.entries(patch).filter(([key]) => !SYNCED_VITALS.some((f) => f.data === key)));
      if (!Object.keys(patch).length) return;
    }
    if (!fromCloud) noteLocalEdit();
    if (usesExternalChar) {
      setC((prev) => prev ? { ...prev, ...patch } : prev);
      return;
    }
    // The store keeps no runtime-only field (the optional-feature catalog):
    // carry them over so rule text keeps resolving after the edit.
    const next = storePatchCharacter(charId, patch, { emit: !fromCloud });
    if (next) setC((prev) => withRuntimeOnlyCharacterFields(next, prev));
    else setC((prev) => prev ? { ...prev, ...patch } : prev);
  }, [charId, usesExternalChar, hasCloudHealth, noteLocalEdit]);

  const syncSheet = useCallback((updates) => {
    if (hasCloudHealth && !isSyncExcluded(charId)) {
      updates = Object.fromEntries(Object.entries(updates).filter(([key]) => !SYNCED_VITALS.some((field) => field.data === key)));
    }
    setSheet((prev) => ({ ...prev, ...updates }));
  }, [hasCloudHealth, charId]);

  // Merge synced vitals without replacing notes, inventory or other local edits.
  // Also apply updates received while the initial sheet was still loading.
  // Own save echoes are no-ops and remote changes never schedule a cloud write.
  useEffect(() => {
    if (!incomingDigest || !sheetReady) return;
    const s = sheetRef.current;
    if (!s) return;
    // Max HP is derived (this sheet's base + the synced bonus). A digest with
    // no current HP means undamaged.
    const raw = pickCharacterVitals(incomingDigest);
    const baseMax = Math.max(1, (Number(s.maxHP) || 1) - (Number(s.maxHPBonus) || 0));
    const maxHP = Math.max(1, baseMax + clampCharacterVitals(raw).maxHPBonus);
    const next = clampCharacterVitals(raw, { maxHP, fallback: { currentHP: maxHP } });
    // Compared field by field through the registry's own normalizer, so a newly
    // synced field is covered the moment it is declared instead of needing a
    // clause here — the omission that let combat conditions arrive and be
    // dismissed as an unchanged echo.
    const unchanged = maxHP === s.maxHP && SYNCED_VITALS.every((field) => (
      JSON.stringify(field.normalize(next[field.data])) === JSON.stringify(field.normalize(s[field.data]))
    ));
    if (unchanged) return;
    setSheet((prev) => (prev ? { ...prev, ...next, maxHP } : prev));
    persist(next, { fromCloud: true });
  }, [incomingDigest, sheetReady, persist]);

  return { persist, syncSheet, sheetConflict, loadRemoteVersion, keepLocalVersion };
}
