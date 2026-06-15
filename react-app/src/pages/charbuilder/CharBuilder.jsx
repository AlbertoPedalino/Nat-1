import { useEffect, useReducer, useRef } from 'react';
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
import PreviewPane from './components/PreviewPane.jsx';
import { STEPS } from './constants.js';
import { adapterRegistry, loadClassAdapters, loadCoreAdapters } from '../../adapters/index.js';
import { getMod, getFinal } from '../charsheet/logic/calculations.js';
import { adaptBuilderData } from '../../adapters/adapterPipeline.js';
import { loadBackgrounds, loadClassIndex, loadFeats, loadItems, loadSpecies, loadSpells, loadOptionalFeatures, extractSheetData, importSheetPayload, saveCharacter } from './logic/index.js';
import { builderReducer, initialBuilderState, normalizeCharacterLevels } from './state.js';
import { BackgroundStep, ClassStep, EquipmentStep, ScoresStep, SheetStep, SpeciesStep } from './steps/index.js';
import {
  createCharacter as storeCreateCharacter,
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

function ActiveStep({ state, dispatch }) {
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
      return <SheetStep {...props} />;
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

  const created = storeCreateCharacter({ name: 'New Character' });
  setActiveCharId(created.id);
  window.history.replaceState(null, '', `${window.location.pathname}?char=${created.id}`);
}

function hasFinishedLoading(loading) {
  return !Object.values(loading || {}).some(Boolean);
}

export default function CharBuilder() {
  const [state, dispatch] = useReducer(builderReducer, undefined, createInitialBuilderState);
  const activeStep = STEPS[state.tab];
  const ActiveIcon = activeStep.icon;
  const ensuredRef = useRef(false);
  const handleImportSheetFile = async (file) => {
    try {
      const payload = extractSheetData(await file.text());
      const result = importSheetPayload(payload, () => window.confirm('Esiste gia un personaggio in questo slot. Sovrascrivere?'));
      const activeCharId = localStorage.getItem('gb:active_char');
      if (activeCharId) {
        window.history.replaceState(null, '', `${window.location.pathname}?char=${activeCharId}`);
      }
      const importedCount = typeof result === 'number' ? result : (result?.imported ? 1 : 0);
      dispatch({ type: 'import/message', message: `Imported ${importedCount} character. Reloading...` });
      window.setTimeout(() => window.location.reload(), 350);
    } catch (error) {
      dispatch({ type: 'import/message', message: `Error: ${error?.message || error}` });
    }
  };

  useEffect(() => {
    if (ensuredRef.current) return;
    ensuredRef.current = true;
    ensureActiveCharacter();
  }, []);

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
        if (!cancelled) dispatch({ type: 'import/message', message: `Adapter load error: ${error?.message || error}` });
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
        if (!cancelled) dispatch({ type: 'import/message', message: `Adapter load error: ${error?.message || error}` });
      });
    return () => { cancelled = true; };
  }, [state.adaptersLoaded, state.character.className, state.character.extraClasses, state.data.items]);

  useEffect(() => {
    if (!state.adaptersLoaded || state.dataAdapted || Object.values(state.loading).some(Boolean)) return;
    const adaptedData = adaptBuilderData(state.data, adapterRegistry, { items: state.data.items });
    dispatch({ type: 'data/adapt', payload: adaptedData });
  }, [state.adaptersLoaded, state.dataAdapted, state.loading, state.data]);

  useEffect(() => {
    if (!hasFinishedLoading(state.loading)) return;
    const handle = setTimeout(() => saveCharacter(state.character, state.data), 300);
    return () => clearTimeout(handle);
  }, [state.character, state.loading, state.data]);

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
            <ImportSheetFab
              message={state.importMessage}
              onMessage={(message) => dispatch({ type: 'import/message', message })}
              onFile={handleImportSheetFile}
              sx={{ ml: 'auto' }}
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

            <ActiveStep state={state} dispatch={dispatch} />

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
