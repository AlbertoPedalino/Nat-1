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
  Tooltip,
  Typography,
  ThemeProvider,
  createTheme,
} from '@mui/material';
import { ChevronLeft, ChevronRight, Home, Wand2 } from 'lucide-react';
import { theme } from '../../theme.js';
import ChoiceDescriptionDialog from './components/ChoiceDescriptionDialog.jsx';
import ImportSheetFab from './components/ImportSheetFab.jsx';
import CloudMenu from '../../shared/cloud/CloudMenu.jsx';
import { excludeFromSync, includeInSync, isSyncExcluded } from '../../shared/cloud/cloudSyncExclude.js';
import PreviewPane from './components/PreviewPane.jsx';
import { STEPS } from './constants.js';
import { adapterRegistry, loadClassAdapters, loadCoreAdapters } from '../../adapters/index.js';
import { getMod, getFinal } from '../charsheet/logic/calculations.js';
import { adaptBuilderData } from '../../adapters/adapterPipeline.js';
import { loadBackgrounds, loadClassIndex, loadFeats, loadItems, loadSpecies, loadSpells, loadOptionalFeatures, loadBeasts, extractSheetData, buildImportedCharacter, saveCharacter, buildSheetCharacter } from './logic/index.js';
import { builderReducer, initialBuilderState, normalizeCharacterLevels } from './state.js';
import { BackgroundStep, ClassStep, EquipmentStep, ScoresStep, SheetStep, SpeciesStep } from './steps/index.js';
import { useAuth } from '../../shared/cloud/AuthProvider.jsx';
import { useToast } from '../../shared/ToastProvider.jsx';
import { getCloudCharacter, pushCharacterData, updateCloudCharacterData, deleteOwnCloudCharacter } from '../../shared/cloud/cloudCharacters.js';
import {
  generateCharId,
  getActiveCharId,
  loadCharacter as storeLoadCharacter,
  setActiveCharId,
} from '../../shared/character/store.js';

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
  const params = new URLSearchParams(window.location.search);
  const charParam = params.get('char');
  if (charParam === 'new') return initialBuilderState;
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
  const params = new URLSearchParams(window.location.search);
  const charParam = params.get('char');

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
    const unified = buildSheetCharacter(state.character, state.data, cloudPrevRef.current || {});
    const withId = { ...unified, id };
    try {
      await pushCharacterData(id, withId);
      builderIdRef.current = id;
      cloudCreatedRef.current = true;
      cloudPrevRef.current = withId;
      includeInSync(id);
      setImportDraft(false);
      window.history.replaceState(null, '', `${window.location.pathname}?char=${id}`);
      notify('success', 'Uploaded to cloud.');
      return id;
    } catch (error) {
      notify('error', `Upload error: ${error?.message || error}`);
      return null;
    }
  };

  // After an explicit "Save local" of an imported draft: keep it local-only
  // (excluded from cloud sync) and resume autosave, which now targets the store.
  const handleDraftLocalSaved = (id) => {
    if (!id) return;
    excludeFromSync(id);
    builderIdRef.current = id;
    cloudCreatedRef.current = false;
    cloudPrevRef.current = null;
    setImportDraft(false);
    window.history.replaceState(null, '', `${window.location.pathname}?char=${id}`);
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
      if (hasExisting && !window.confirm('Esiste gia un personaggio nel builder. Sovrascrivere con la scheda importata?')) {
        notify('info', 'Import annullato.');
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
      setImportDraft(true);
      dispatch({ type: 'character/restore', character });
      window.history.replaceState(null, '', `${window.location.pathname}?char=new`);
      notify('success', 'Imported. Save local or upload to cloud from the Sheet step.');
    } catch (error) {
      notify('error', `Import error: ${error?.message || error}`);
    }
  };

  useEffect(() => {
    if (!authResolved || hydratedRef.current) return;
    const charParam = new URLSearchParams(window.location.search).get('char');
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

  useEffect(() => {
    const run = async (scope, loader, mapResult) => {
      dispatch({ type: 'data/load-start', scope });
      try {
        const result = await loader();
        dispatch({ type: 'data/load-success', scope, payload: mapResult(result) });
      } catch (error) {
        dispatch({ type: 'data/load-error', scope, error: error?.message || String(error) });
      }
    };

    run('classes', loadClassIndex, (result) => ({
      classCache: result.cache,
      classes: result.classes,
      subclasses: result.subclasses,
      classFeatures: result.classFeatures,
      subclassFeatures: result.subclassFeatures,
    }));
    run('species', loadSpecies, (species) => ({ species }));
    run('backgrounds', loadBackgrounds, (backgrounds) => ({ backgrounds }));
    run('feats', loadFeats, (feats) => ({ feats }));
    run('spells', loadSpells, (result) => ({ spells: result.spells, classSpellIndex: result.classSpellIndex }));
    run('items', loadItems, (items) => ({ items }));
    run('optionalFeatures', loadOptionalFeatures, (optionalFeatures) => ({ optionalFeatures }));
    run('beasts', loadBeasts, (beasts) => ({ beasts }));
  }, []);

  useEffect(() => {
    if (state.adaptersLoaded || state.loading.items) return;
    let cancelled = false;
    const activeClasses = [state.character.className, ...(state.character.extraClasses || []).map((extra) => extra.name)].filter(Boolean);
    Promise.all([
      loadCoreAdapters({ items: state.data.items }),
      loadClassAdapters(activeClasses, { items: state.data.items, getMod, getFinal }),
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
    const classes = [state.character.className, ...(state.character.extraClasses || []).map((extra) => extra.name)].filter(Boolean);
    if (!classes.length) return;
    let cancelled = false;
    loadClassAdapters(classes, { items: state.data.items, getMod, getFinal })
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
    const adaptedData = adaptBuilderData(state.data, adapterRegistry, { items: state.data.items });
    dispatch({ type: 'data/adapt', payload: adaptedData });
  }, [state.adaptersLoaded, state.dataAdapted, state.loading, state.data]);

  useEffect(() => {
    if (!hasFinishedLoading(state.loading) || !authResolved) return;
    // Cloud mode must wait for the initial pull, or a blank builder state would
    // overwrite the real server character before it loads.
    if (cloudActive && !hydratedRef.current) return;
    // A pending online import draft is persisted nowhere until the user uploads it.
    if (importDraft) return;

    const handle = setTimeout(() => {
      const activeId = builderIdRef.current || getActiveCharId();
      // Imported sheets stay local even when logged in; everything else goes to
      // the server only.
      const useCloud = cloudActive && !(activeId && isSyncExcluded(activeId));

      if (useCloud) {
        // Save straight to the server on open (no need to "Open sheet" first) and
        // on every edit — never touching localStorage. The first save inserts the
        // row; later saves update it in place.
        const unified = buildSheetCharacter(state.character, state.data, cloudPrevRef.current || {});
        let id = builderIdRef.current;
        if (!id) {
          id = generateCharId();
          builderIdRef.current = id;
          // Point the URL at the new id so a reload/edit targets the same character.
          window.history.replaceState(null, '', `${window.location.pathname}?char=${id}`);
        }
        const withId = { ...unified, id };
        const op = cloudCreatedRef.current
          ? updateCloudCharacterData(id, withId)
          : pushCharacterData(id, withId);
        op
          .then(() => { cloudCreatedRef.current = true; cloudPrevRef.current = withId; })
          .catch((error) => notify('error', `Cloud save error: ${error?.message || error}`));
        return;
      }

      // Logged out: persist to the local store as before.
      const hadId = getActiveCharId();
      const saved = saveCharacter(state.character, state.data, { createIfMissing: true });
      if (saved?.id && !hadId) {
        window.history.replaceState(null, '', `${window.location.pathname}?char=${saved.id}`);
      }
    }, cloudActive ? 1200 : 300);
    return () => clearTimeout(handle);
  }, [state.character, state.loading, state.data, authResolved, cloudActive, importDraft]);

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
      <AppBar position="sticky" color="default" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'rgba(26,23,19,0.98)', backgroundImage: 'none' }}>
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
            <CloudMenu
              sx={{ ml: 'auto' }}
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
              <Typography variant="h1" noWrap sx={{ fontSize: '1.12rem', letterSpacing: '0.04em', color: '#edd48a' }}>
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
        <Paper variant="outlined" sx={{ mb: 1, bgcolor: 'rgba(35,32,26,1)', overflow: 'hidden' }}>
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
            <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 0.75, color: 'primary.main' }}>
              <ActiveIcon size={16} />
              <Typography variant="h2" sx={{ fontSize: '0.86rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'primary.main' }}>{activeStep.label}</Typography>
              <Chip size="small" label={`${state.tab + 1} / ${STEPS.length}`} sx={{ height: 18, fontSize: '0.54rem' }} />
            </Stack>

            <ActiveStep
              state={state}
              dispatch={dispatch}
              sheetProps={{ importDraft, onUploadToCloud: handleUploadToCloud, onDraftLocalSaved: handleDraftLocalSaved, onNotify: notify }}
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

const builderRootSx = {
  minHeight: '100vh',
  bgcolor: 'background.default',
  '& .MuiPaper-root, & .MuiCard-root': {
    bgcolor: 'rgba(35,32,26,1)',
    backgroundImage: 'none',
    borderColor: 'divider',
    borderRadius: 1,
  },
  // Builder component defaults live in `builderTheme` below. Theme overrides
  // keep specificity low so component `sx` can still set colors and sizing.
  '& .MuiButton-root': {
    minHeight: 0,
    borderRadius: 1,
    fontFamily: '"Cinzel", Georgia, serif',
    fontSize: '0.62rem',
    letterSpacing: '0.04em',
    px: 1,
    py: 0.38,
  },
  '& .MuiTab-root': {
    minHeight: 0,
    py: 0.75,
    px: 1.05,
    fontFamily: '"Cinzel", Georgia, serif',
    fontSize: '0.6rem',
    letterSpacing: '0.06em',
    color: 'text.secondary',
  },
  '& .MuiTabs-indicator': { bgcolor: 'primary.main' },
  '& .MuiInputBase-root': {
    bgcolor: 'rgba(26,23,19,1)',
    borderRadius: 1,
    fontSize: '0.74rem',
  },
  '& .MuiInputBase-input': {
    py: '7px',
    fontSize: '0.74rem',
  },
  '& .MuiAlert-root': {
    py: 0.35,
    px: 1,
    fontSize: '0.7rem',
    bgcolor: 'rgba(35,32,26,1)',
    border: '1px solid rgba(215,173,82,0.18)',
    color: 'text.secondary',
  },
  '& .MuiCardContent-root': {
    p: 0.75,
    '&:last-child': { pb: 0.75 },
  },
};

// Builder-scoped component defaults use theme overrides instead of descendant
// selectors in `builderRootSx`. This keeps component `sx` authoritative for
// custom colors/sizes. Scoped to the builder via the ThemeProvider in render.
const CINZEL = '"Cinzel", Georgia, serif';
const BUILDER_SELECTED_SX = {
  color: '#f0e6d4',
  backgroundColor: 'rgba(215, 173, 82, 0.20)',
  boxShadow: 'inset 3px 0 0 #d7ad52',
};
const BUILDER_SELECTED_HOVER_BG = 'rgba(215, 173, 82, 0.28)';
const builderTheme = createTheme(theme, {
  components: {
    MuiTypography: {
      styleOverrides: {
        h1: { fontFamily: CINZEL, fontSize: '1.08rem', lineHeight: 1.15, fontWeight: 800 },
        h2: { fontFamily: CINZEL, fontSize: '0.82rem', lineHeight: 1.2, fontWeight: 800 },
        body1: { fontSize: '0.8rem' },
        body2: { fontSize: '0.72rem' },
        caption: { fontSize: '0.62rem' },
        overline: { fontFamily: CINZEL, fontSize: '0.56rem', lineHeight: 1.6, fontWeight: 800 },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          height: 19,
          borderRadius: '3px',
          fontFamily: CINZEL,
          fontSize: '0.54rem',
          letterSpacing: '0.04em',
          backgroundColor: 'rgba(202,165,80,0.08)',
          borderColor: 'rgba(202,165,80,0.28)',
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          padding: '4.4px 7.2px',
          backgroundColor: 'rgba(35,32,26,1)',
          '&.Mui-selected': BUILDER_SELECTED_SX,
          '&.Mui-selected:hover': {
            backgroundColor: BUILDER_SELECTED_HOVER_BG,
          },
          '&:hover': {
            backgroundColor: 'rgba(46,42,34,1)',
          },
        },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          color: '#bda98a',
          '&.Mui-selected': BUILDER_SELECTED_SX,
          '&.Mui-selected:hover': {
            backgroundColor: BUILDER_SELECTED_HOVER_BG,
          },
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          '&.Mui-selected': BUILDER_SELECTED_SX,
          '&.Mui-selected:hover': {
            backgroundColor: BUILDER_SELECTED_HOVER_BG,
          },
        },
      },
    },
  },
});

const builderAppNavSx = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-start',
  flexWrap: 'wrap',
  gap: '0.35rem',
  py: '0.35rem',
  borderBottom: 1,
  borderColor: 'rgba(237,212,138,0.14)',
};

const appNavButtonSx = {
  fontFamily: '"Cinzel", Georgia, serif',
  fontSize: '0.625rem',
  letterSpacing: '0.08em',
};
