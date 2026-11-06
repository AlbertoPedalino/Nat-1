import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Box, Stack } from '@mui/material';
import { SHEET_AREAS, SHEET_GRID, SHEET_GRID_ITEM_SX } from './layout/layout.js';
import TopBar from './layout/TopBar.jsx';
import AbilityScores from './stats/AbilityScores.jsx';
import HPBlock from './resources/HPBlock.jsx';
import SavingThrows from './stats/SavingThrows.jsx';
import Senses from './stats/Senses.jsx';
import Proficiencies from './proficiency/Proficiencies.jsx';
import Skills from './stats/Skills.jsx';
import Movement from './stats/Movement.jsx';
import RightTop from './stats/RightTop.jsx';
import TabsPanel from './layout/TabsPanel.jsx';
import RestDialogs from './resources/RestDialogs.jsx';
import { useRests } from './resources/useRests.js';
import DiceToast from '../../shared/character/dice/DiceToast.jsx';
import SheetConflictBanner from '../../shared/ui/SheetConflictBanner.jsx';
import { deriveSheetState } from '../../shared/character/sheet/sheetState.js';
import { ProficiencySetsProvider } from './proficiency/ProficiencySetsContext.jsx';
import { SheetActionsProvider } from './state/SheetActionsContext.jsx';
import { useSheetVitals } from './state/useSheetVitals.js';
import { useSheetRolls } from './state/useSheetRolls.js';
import { useSheetCloudSave } from './state/useSheetCloudSave.js';
import {
  initialSheetResources,
  loadSheetReferenceData,
  reconcileLoadedCharacter,
} from './state/sheetLoad.js';
import { normalizeCharacterAttunement } from './inventory/attunement.js';
import { commandCharacterVitals } from '../../shared/cloud/api/healthCommands.js';
import { useCharacterDigests } from '../../shared/cloud/sync/useCharacterDigests.js';
import { useAuth } from '../../shared/cloud/auth/AuthProvider.jsx';
import { isSyncExcluded } from '../../shared/cloud/sync/cloudSyncExclude.js';
import { withRuntimeOnlyCharacterFields } from '../../shared/character/profile/runtimeFields.js';
import {
  SYNCED_VITALS,
  clampCharacterVitals,
  pickCharacterVitals,
} from '../../shared/character/combat/vitals.js';
import {
  getActiveCharId,
  getCharacterSyncMeta,
  loadCharacter as storeLoadCharacter,
  patchCharacter as storePatchCharacter,
  setActiveCharId,
} from '../../shared/character/profile/store.js';
import { characterIdFromUrl } from '../../shared/character/profile/characterRoutes.js';

const noopEffect = () => {};

function getCharIdFromUrl() {
  return characterIdFromUrl() || getActiveCharId();
}

const EMBEDDED_SHEET_GRID = {
  gridTemplateColumns: '1fr',
  gridTemplateAreas: `
    "${SHEET_AREAS.saves}"
    "${SHEET_AREAS.skills}"
    "${SHEET_AREAS.senses}"
    "${SHEET_AREAS.movement}"
    "${SHEET_AREAS.profs}"
    "${SHEET_AREAS.right}"
  `,
  gap: '0.55rem',
};

export default function CharacterSheet({
  externalChar = null,
  externalCharId = null,
  // The sheet revision of `externalChar`; with `onSheetRow` the parent takes a
  // newer row when this sheet finds its content changed elsewhere.
  externalSheetRevision = null,
  onSheetRow = null,
  onSheetDeleted = null,
  readOnly = false,
  embedded = false,
  liveDigest,
  onRoll = null,
  showOwnRollToast = true,
} = {}) {
  const [C, setC] = useState(null);
  const [sheet, setSheet] = useState(null);
  const sheetRef = useRef(null);
  const [charId, setCharId] = useState(null);
  const [tab, setTab] = useState(0);
  const {
    diceToast, setDiceToast, rollLog, setRollLog, showDiceToast, showNotice, rollD20, rollSave, rollSkill,
  } = useSheetRolls({ C, sheet, charId, onRoll, showOwnRollToast });
  const [resources, setResources] = useState({});
  const [freeCastUses, setFreeCastUses] = useState({});
  const [conditionEntries, setConditionEntries] = useState({});
  // The sheet revision of the loaded copy (content sync, useSheetCloudSave).
  const [sheetBaseRevision, setSheetBaseRevision] = useState(null);
  const usesExternalChar = Boolean(externalChar);
  const auth = useAuth();
  const hasCloudHealth = usesExternalChar || (auth.cloudEnabled && auth.status === 'authed');
  const sheetReady = Boolean(sheet);
  sheetRef.current = sheet;

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
    C, charId, healthId, usesExternalChar, readOnly, onSheetRow, onSheetDeleted, sheetBaseRevision, showNotice,
  });

  useEffect(() => {
    if (embedded) return;
    const characterName = String(C?.name || '').trim();
    if (characterName) document.title = characterName;
  }, [C?.name, embedded]);

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
        .catch((error) => setDiceToast({ label: 'Health update failed', detail: error.message, rolls: [], timestamp: Date.now() }));
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

  const updateCurrentCharacter = useCallback((updater) => {
    if (!C) return;
    const next = typeof updater === 'function' ? updater(C) : updater;
    const patch = Object.fromEntries(Object.entries(next).filter(([key, value]) => JSON.stringify(value) !== JSON.stringify(C[key])));
    persist(patch, Object.hasOwn(patch, 'tempHP') ? { command: { type: 'grantTempHp', value: patch.tempHP } } : {});
  }, [C, persist]);

  const updateInventory = useCallback((inventory) => {
    const normalized = normalizeCharacterAttunement(C, inventory);
    setSheet((prev) => ({ ...prev, sheetInventory: normalized }));
    updateCurrentCharacter((prev) => ({ ...prev, inventory: normalized }));
  }, [C, updateCurrentCharacter]);

  const updateCurrency = useCallback((currency) => {
    setSheet((prev) => ({ ...prev, sheetCurrency: currency }));
    updateCurrentCharacter((prev) => ({ ...prev, currency }));
  }, [updateCurrentCharacter]);

  const updateSpells = useCallback((nextSpellData) => {
    updateCurrentCharacter((prev) => ({ ...prev, ...nextSpellData }));
  }, [updateCurrentCharacter]);

  const saveResourcesState = useCallback((next) => {
    setResources(next);
    persist({ resources: next });
  }, [persist]);

  const rest = useRests({
    C, sheet, setSheet, resources, setResources, freeCastUses, setFreeCastUses, persist, showDiceToast, showNotice,
  });

  const {
    adjustHP,
    adjustTempHP,
    adjustMaxHpBonus,
    setCurrentHP,
    setTempHP,
    setMaxHpBonus,
    setDeathSave,
    rollDeathSave,
    setExhaustion,
    toggleCondition,
    clearConditions,
    effectActions,
    toggleInspiration,
  } = useSheetVitals({ C, sheet, setSheet, persist, showDiceToast, showNotice });

  const readOnlyEffectActions = useMemo(() => ({
    add: noopEffect, remove: noopEffect, readOnly: true,
  }), []);

  const updateXp = useCallback((val) => {
    const xp = parseInt(val) || 0;
    setSheet((prev) => ({ ...prev, xpStored: xp }));
    updateCurrentCharacter((prev) => ({ ...prev, xp }));
  }, [updateCurrentCharacter]);

  const updateNotes = useCallback((val) => {
    setSheet((prev) => ({ ...prev, notes: val }));
    persist({ notes: val });
  }, [persist]);

  const toggleFreeCast = useCallback((freeCast) => {
    setFreeCastUses((prev) => {
      const used = Math.max(0, Number(prev?.[freeCast.id] || 0));
      const max = Math.max(1, Number(freeCast.max || 1));
      const next = { ...(prev || {}) };
      if (used >= max) delete next[freeCast.id];
      else next[freeCast.id] = used + 1;
      persist({ freeCastUses: next });
      return next;
    });
  }, [persist]);

  const noop = useCallback(() => {}, []);

  // Stable, cross-cutting handlers shared with the deep tab/card tree via context.
  const sheetActions = useMemo(() => ({
    onRoll: rollD20,
    onShowToast: showDiceToast,
    setResources: saveResourcesState,
    onUpdateInventory: updateInventory,
    onUpdateCurrency: updateCurrency,
    onUpdateSpells: updateSpells,
    onUpdateSheet: syncSheet,
    onUpdateNotes: updateNotes,
    onUpdateCharacter: updateCurrentCharacter,
    onToggleFreeCast: toggleFreeCast,
  }), [
    rollD20, showDiceToast, saveResourcesState, updateInventory, updateCurrency,
    updateSpells, syncSheet, updateNotes, updateCurrentCharacter, toggleFreeCast,
  ]);

  // Read-only keeps navigation + dice rolls, but every data mutation becomes a
  // no-op (no spending slots, no adding items/spells, no HP/condition changes).
  const effectiveActions = useMemo(() => (
    readOnly
      ? {
          ...sheetActions,
          readOnly: true,
          setResources: noop,
          onUpdateInventory: noop,
          onUpdateCurrency: noop,
          onUpdateSpells: noop,
          onUpdateSheet: noop,
          onUpdateNotes: noop,
          onUpdateCharacter: noop,
          onToggleFreeCast: noop,
        }
      : { ...sheetActions, readOnly: false }
  ), [readOnly, sheetActions, noop]);

  if (!C || !sheet) {
    return (
      <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary', fontSize: '1.1rem' }}>
        No character found. Go back to the builder to create a character.
      </Box>
    );
  }

  const sheetGridSx = embedded ? EMBEDDED_SHEET_GRID : SHEET_GRID;

  return (
    <ProficiencySetsProvider character={C}>
    <SheetActionsProvider value={effectiveActions}>
    <Box sx={{ minHeight: embedded ? 'auto' : '100vh', bgcolor: 'background.default', pb: embedded ? 1 : 4, width: '100%' }}>
      <TopBar C={C} sheet={sheet} charId={charId} readOnly={readOnly} embedded={embedded} onShortRest={rest.openShortRest} onLongRest={rest.openLongRest} onUpdateXp={updateXp} onUpdateCharacter={updateCurrentCharacter}
        rollLog={rollLog} onClearRollLog={() => setRollLog([])} onShowToast={showDiceToast} />
      <Box sx={{ maxWidth: embedded ? 'none' : 1280, mx: embedded ? 0 : { md: 'auto' }, px: embedded ? 0 : { xs: '0.6rem', md: '1.1rem' }, overflow: 'hidden' }}>
        {sheetConflict ? (
          <SheetConflictBanner onLoadRemote={loadRemoteVersion} onKeepLocal={keepLocalVersion} />
        ) : null}
        <Stack direction={embedded ? 'column' : { xs: 'column', md: 'row-reverse' }} spacing={0.8} sx={{ pt: '0.55rem', alignItems: embedded ? 'stretch' : { md: 'stretch' } }}>
          <HPBlock sheet={sheet} fillWidth={embedded}
            onHeal={readOnly ? noop : (amt) => adjustHP(1, amt)} onDamage={readOnly ? noop : (amt) => adjustHP(-1, amt)}
            onTempHP={readOnly ? noop : adjustTempHP} onMaxHPBonus={readOnly ? noop : adjustMaxHpBonus}
            onSetHP={readOnly ? noop : setCurrentHP} onSetTempHP={readOnly ? noop : setTempHP} onSetMaxHPBonus={readOnly ? noop : setMaxHpBonus}
            onDeathSave={readOnly ? noop : rollDeathSave} onDeathSaveSet={readOnly ? noop : setDeathSave} />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <AbilityScores C={C} sheet={sheet} onRoll={rollD20} />
          </Box>
        </Stack>
        <Box sx={{
          display: 'grid',
          width: '100%',
          ...sheetGridSx,
          pt: '0.55rem',
          alignItems: 'start',
          minWidth: 0,
        }}>
          {/* Left column: `display: contents` on xs lets each child participate in the
              outer grid via its own gridArea. On md the wrapper collapses into a single
              `leftCol` grid cell containing the panels as flex children, decoupling
              their row heights from the right column. */}
          <Box sx={{
            display: embedded ? 'contents' : { xs: 'contents', md: 'flex' },
            flexDirection: embedded ? undefined : { md: 'column' },
            gap: embedded ? undefined : { md: '0.55rem' },
            gridArea: embedded ? undefined : { md: SHEET_AREAS.leftCol },
            ...SHEET_GRID_ITEM_SX,
          }}>
            <Box sx={{ gridArea: { xs: SHEET_AREAS.saves } }}>
              <SavingThrows C={C} sheet={sheet} onRoll={rollSave} />
            </Box>
            <Box sx={{ gridArea: { xs: SHEET_AREAS.senses } }}>
              <Senses C={C} />
            </Box>
            <Box sx={{ gridArea: { xs: SHEET_AREAS.movement } }}>
              <Movement C={C} sheet={sheet} />
            </Box>
            <Box sx={{ gridArea: { xs: SHEET_AREAS.profs } }}>
              <Proficiencies C={C} />
            </Box>
          </Box>
          <Box sx={{ ...SHEET_GRID_ITEM_SX, gridArea: SHEET_AREAS.skills }}>
            <Skills C={C} sheet={sheet} onRoll={rollSkill} />
          </Box>
          <Stack spacing={0.55} sx={{ ...SHEET_GRID_ITEM_SX, gridArea: SHEET_AREAS.right }}>
            <RightTop C={C} sheet={sheet} onRoll={rollD20}
              onToggleCondition={readOnly ? noop : toggleCondition} onClearConditions={readOnly ? noop : clearConditions}
              effectActions={readOnly ? readOnlyEffectActions : effectActions}
              onSetExhaustion={readOnly ? noop : setExhaustion}
              conditionEntries={conditionEntries}
              onToggleInspiration={readOnly ? noop : toggleInspiration}
              resources={resources} setResources={readOnly ? noop : saveResourcesState} onShowToast={showDiceToast} />
            <TabsPanel C={C} sheet={sheet} tab={tab} setTab={setTab}
              resources={resources} freeCastUses={freeCastUses} />
          </Stack>
        </Box>
      </Box>
      {showOwnRollToast && diceToast ? <DiceToast toast={diceToast} onClose={() => setDiceToast(null)} /> : null}

      <RestDialogs C={C} sheet={sheet} rest={rest} />
    </Box>
    </SheetActionsProvider>
    </ProficiencySetsProvider>
  );
}
