import { useEffect, useReducer, useRef, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  AppBar,
  Box,
  Button,
  Chip,
  Divider,
  Paper,
  Stack,
  Tab,
  Tabs,
  Toolbar,
  Typography,
  ThemeProvider,
} from '@mui/material';
import { ChevronLeft, ChevronRight, Home, Wand2 } from 'lucide-react';
import ChoiceDescriptionDialog from './choices/ChoiceDescriptionDialog.jsx';
import ImportSheetFab from './layout/ImportSheetFab.jsx';
import CloudMenu from '../../shared/cloud/auth/CloudMenu.jsx';
import CompendiumButton from '../compendium/CompendiumButton.jsx';
import { excludeFromSync, includeInSync, isSyncExcluded } from '../../shared/cloud/sync/cloudSyncExclude.js';
import PreviewPane from './preview/PreviewPane.jsx';
import { STEPS } from './constants.js';
import { adapterRegistry } from '../../adapters/registry.js';
import { loadClassAdapters, loadCoreAdapters } from '../../adapters/index.js';
import { adaptBuilderData } from '../../adapters/adapterPipeline.js';
import { useBuilderData } from './state/useBuilderData.js';
import BuilderDataAlert from './layout/BuilderDataAlert.jsx';
import { builderRootSx, builderTheme } from './layout/builderTheme.js';
import { extractSheetData, buildImportedCharacter, saveCharacter, buildSheetCharacter } from './state/persistence.js';
import { builderReducer, initialBuilderState, normalizeCharacterLevels } from './state/state.js';
import BackgroundStep from './steps/BackgroundStep.jsx';
import ClassStep from './steps/ClassStep.jsx';
import EquipmentStep from './steps/EquipmentStep.jsx';
import ScoresStep from './steps/ScoresStep.jsx';
import SheetStep from './steps/SheetStep.jsx';
import SpeciesStep from './steps/SpeciesStep.jsx';
import { useAuth } from '../../shared/cloud/auth/AuthProvider.jsx';
import { useToast } from '../../shared/ui/ToastProvider.jsx';
import {
  deleteOwnCloudCharacter, getCloudCharacter, getCloudSheetRevision,
} from '../../shared/cloud/api/cloudCharacters.js';
import { saveBuilderCharacter } from './state/cloudSave.js';
import { useCharacterCloudSave } from '../../shared/cloud/sync/useCharacterCloudSave.js';
import { CHARACTER_SHEET_SAVED_EVENT } from '../../shared/cloud/sync/characterEvents.js';
import SheetConflictBanner from '../../shared/ui/SheetConflictBanner.jsx';
import {
  generateCharId,
  getActiveCharId,
  loadCharacter as storeLoadCharacter,
  rebaseCharacterSync,
  setActiveCharId,
} from '../../shared/character/profile/store.js';
import { confirmAction } from '../../shared/ui/confirmAction.js';
import { useEventListener } from '../../shared/ui/useEventListener.js';
import { UI_COLORS, uiAlpha } from '../../shared/ui/colors.js';
import { UI_FONTS } from '../../shared/ui/fonts.js';
import { NEW_CHARACTER, characterIdFromUrl, replaceCharacterIdInUrl } from '../../shared/character/profile/characterRoutes.js';
import { classNames } from '../../shared/character/progression/classLevel.js';

function StepLabel({ step, index }) {
  const Icon = step.icon;
  return (
    <Stack direction="row" spacing={0.65} alignItems="center" sx={{ minWidth: 0 }}>
      <Chip size="small" label={index + 1} sx={{ height: 18, fontSize: '0.56rem' }} />
      <Icon size={14} />
      <span>{step.label}</span>
    </Stack>
  );
}

function ActiveStep({ state, dispatch, sheetProps }) {
  const props = { state, dispatch };
  switch (STEPS[state.tab].id) {
    case 'class':
      return <ClassStep {...props} />;
    case 'species':
      return <SpeciesStep {...props} />;
    case 'background':
      return <BackgroundStep {...props} />;
    case 'scores':
      return <ScoresStep {...props} />;
    case 'equipment':
      return <EquipmentStep {...props} />;
    case 'sheet':
      return <SheetStep {...props} {...sheetProps} />;
    default:
      return null;
  }
}

function createInitialBuilderState() {
  const charParam = characterIdFromUrl();
  if (charParam === NEW_CHARACTER) return initialBuilderState;
  const targetId = (charParam && charParam !== 'new') ? charParam : getActiveCharId();
  if (!targetId) return initialBuilderState;
  const stored = storeLoadCharacter(targetId);
  if (!stored) return initialBuilderState;
  return {
    ...initialBuilderState,
    character: { ...initialBuilderState.character, ...normalizeCharacterLevels(stored) },
  };
}

function ensureActiveCharacter() {
  const charParam = characterIdFromUrl();

  if (charParam === 'new') {
    setActiveCharId(null);
    return;
  }

  if (charParam && charParam !== 'new') {
    const stored = storeLoadCharacter(charParam);
    if (stored) {
      setActiveCharId(charParam);
      return;
    }
  }

  if (charParam !== 'new') {
    const activeId = getActiveCharId();
    if (activeId && storeLoadCharacter(activeId)) {
      setActiveCharId(activeId);
      return;
    }
  }

  setActiveCharId(null);
}

function hasFinishedLoading(loading) {
  return !Object.values(loading || {}).some(Boolean);
}

export default function CharBuilder() {
  const [state, dispatch] = useReducer(builderReducer, undefined, createInitialBuilderState);
  const { notify } = useToast();
  const activeStep = STEPS[state.tab];
  const ActiveIcon = activeStep.icon;
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
      const character = buildImportedCharacter(payload);
      const cur = state.character;
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
      dispatch({ type: 'character/restore', character });
      replaceCharacterIdInUrl(NEW_CHARACTER);
      notify('success', 'Imported. Save local or upload to cloud from the Sheet step.');
    } catch (error) {
      notify('error', `Import error: ${error?.message || error}`);
    }
  };

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

  const reloadData = useBuilderData(dispatch);

  useEffect(() => {
    if (state.adaptersLoaded || state.loading.items) return;
    let cancelled = false;
    const activeClasses = classNames(state.character);
    Promise.all([
      loadCoreAdapters({ items: state.data.items }),
      loadClassAdapters(activeClasses, { items: state.data.items }),
    ])
      .then(() => {
        if (!cancelled) dispatch({ type: 'adapters/loaded' });
      })
      .catch((error) => {
        if (!cancelled) notify('error', `Adapter load error: ${error?.message || error}`);
      });
    return () => {
      cancelled = true;
    };
  }, [state.adaptersLoaded, state.loading.items, state.data.items]);

  useEffect(() => {
    if (!state.adaptersLoaded) return;
    const classes = classNames(state.character);
    if (!classes.length) return;
    let cancelled = false;
    loadClassAdapters(classes, { items: state.data.items })
      .then((result) => {
        if (cancelled) return;
        if (result?.loadedNewAdapters) {
          dispatch({ type: 'adapters/loaded-for-classes', classes: result.loadedClasses });
        }
      })
      .catch((error) => {
        if (!cancelled) notify('error', `Adapter load error: ${error?.message || error}`);
      });
    return () => { cancelled = true; };
  }, [state.adaptersLoaded, state.character.className, state.character.extraClasses, state.data.items]);

  useEffect(() => {
    if (!state.adaptersLoaded || state.dataAdapted || Object.values(state.loading).some(Boolean)) return;
    const adaptedData = adaptBuilderData(state.data, adapterRegistry, { items: state.data.items, itemsAlreadyAdapted: true });
    dispatch({ type: 'data/adapt', payload: adaptedData });
  }, [state.adaptersLoaded, state.dataAdapted, state.loading, state.data]);

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

  useEffect(() => {
    // Re-hydrate the PRIMARY class object only. class/select is tab-aware: on an
    // extra-class tab it would write the primary class into the extra slot, so
    // guard on the primary tab. (data/adapt also restores cls tab-agnostically.)
    if (!state.character.cls && state.character.activeClassTab === 0 && state.data.classes.length) {
      const cls = state.data.classes.find((item) => item.name === state.character.className && item.source === state.character.classSource);
      if (cls) dispatch({ type: 'class/select', className: cls.name, source: cls.source, classObject: cls });
    }
    if (!state.character.speciesObj && state.data.species.length) {
      const species = state.data.species.find((item) => item.name === state.character.speciesName && item.source === state.character.speciesSource);
      if (species) dispatch({ type: 'species/select', name: species.name, source: species.source, speciesObj: species });
    }
    if (!state.character.backgroundObj && state.data.backgrounds.length) {
      const background = state.data.backgrounds.find((item) => item.name === state.character.backgroundName && item.source === state.character.backgroundSource);
      if (background) dispatch({ type: 'background/select', name: background.name, source: background.source, backgroundObj: background, feat: background.feat });
    }
  }, [state.data.classes, state.data.species, state.data.backgrounds, state.character]);

  return (
    <ThemeProvider theme={builderTheme}>
    <Box sx={builderRootSx}>
      <AppBar position="sticky" color="default" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: uiAlpha(UI_COLORS.surfaceDeep, 0.98), backgroundImage: 'none' }}>
        <Box sx={{ maxWidth: 1360, width: '100%', mx: 'auto', px: { xs: 0.75, md: 1.1 } }}>
          <Box sx={builderAppNavSx}>
            <Button
              component={RouterLink}
              to="/"
              size="small"
              variant="outlined"
              color="primary"
              startIcon={<Home size={14} />}
              sx={appNavButtonSx}
            >
              HOME
            </Button>
            <CompendiumButton sx={[appNavButtonSx, { ml: 'auto' }]} />
            <CloudMenu
              buttonSx={appNavButtonSx}
              canUploadDraft={importDraft && cloudActive}
              onUploadDraft={handleUploadToCloud}
            />
            <ImportSheetFab
              onNotify={notify}
              onFile={handleImportSheetFile}
              sx={{ ml: 0.5 }}
              buttonSx={appNavButtonSx}
            />
          </Box>

          <Toolbar disableGutters sx={{ gap: 1, minHeight: '52px !important', pr: { xs: 12, md: 16 } }}>
            <Wand2 size={19} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="h1" noWrap sx={{ fontSize: '1.12rem', letterSpacing: '0.04em', color: UI_COLORS.goldLight }}>
                Character Builder
              </Typography>
              <Typography variant="body2" color="text.secondary" noWrap sx={{ fontSize: '0.64rem' }}>
                D&D 5e 2024
              </Typography>
            </Box>
          </Toolbar>
        </Box>
      </AppBar>

      <Box sx={{ maxWidth: 1360, mx: 'auto', px: { xs: 0.75, md: 1.1 }, py: 1.1 }}>
        <Paper variant="outlined" sx={{ mb: 1, bgcolor: UI_COLORS.headerBg, overflow: 'hidden' }}>
          <Tabs
            value={state.tab}
            onChange={(_, tab) => dispatch({ type: 'tab/set', tab })}
            variant="scrollable"
            scrollButtons="auto"
            aria-label="Character builder steps"
          >
            {STEPS.map((step, index) => (
              <Tab key={step.id} label={<StepLabel step={step} index={index} />} />
            ))}
          </Tabs>
        </Paper>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) 320px', xl: 'minmax(0, 1fr) 360px' },
            alignItems: 'start',
            gap: 1,
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <BuilderDataAlert errors={state.errors} onRetry={reloadData} />
            {cloudConflict ? (
              <SheetConflictBanner subject="character" onLoadRemote={loadCloudVersion} onKeepLocal={keepBuilderVersion} />
            ) : null}
            <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 0.75, color: 'primary.main' }}>
              <ActiveIcon size={16} />
              <Typography variant="h2" sx={{ fontSize: '0.86rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'primary.main' }}>{activeStep.label}</Typography>
              <Chip size="small" label={`${state.tab + 1} / ${STEPS.length}`} sx={{ height: 18, fontSize: '0.54rem' }} />
            </Stack>

            <ActiveStep
              state={state}
              dispatch={dispatch}
              sheetProps={{
                importDraft,
                onUploadToCloud: handleUploadToCloud,
                onDraftLocalSaved: handleDraftLocalSaved,
                onCloudCopySavedLocally: (id) => { if (id === builderIdRef.current) rebaseCharacterSync(id, sheetRevisionRef.current); },
                onNotify: notify,
              }}
            />

            <Divider sx={{ my: 1 }} />
            <Stack direction="row" justifyContent="space-between">
              <Button
                startIcon={<ChevronLeft size={16} />}
                disabled={state.tab === 0}
                onClick={() => dispatch({ type: 'tab/set', tab: Math.max(0, state.tab - 1) })}
              >
                Back
              </Button>
              <Button
                variant="contained"
                endIcon={<ChevronRight size={16} />}
                disabled={state.tab === STEPS.length - 1}
                onClick={() => dispatch({ type: 'tab/set', tab: Math.min(STEPS.length - 1, state.tab + 1) })}
              >
                Next
              </Button>
            </Stack>
          </Box>

          <Box sx={{ minWidth: 0 }}>
            <PreviewPane
              character={state.character}
              items={state.data.items}
              feats={state.data.feats}
            />
          </Box>
        </Box>

        <Typography component="footer" variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.4, textAlign: 'center', fontSize: '0.58rem' }}>
          Data from 5etools via GitHub mirror - D&D 5e is a trademark of Wizards of the Coast
        </Typography>
      </Box>

      <ChoiceDescriptionDialog value={state.choiceDialog} onClose={() => dispatch({ type: 'choice/close' })} />
    </Box>
    </ThemeProvider>
  );
}

const builderAppNavSx = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-start',
  flexWrap: 'wrap',
  gap: '0.35rem',
  py: '0.35rem',
  borderBottom: 1,
  borderColor: uiAlpha(UI_COLORS.goldLight, 0.14),
};

const appNavButtonSx = {
  fontFamily: UI_FONTS.display,
  fontSize: '0.625rem',
  letterSpacing: '0.08em',
};
