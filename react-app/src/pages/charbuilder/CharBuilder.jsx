import { useReducer } from 'react';
import {
  Box,
  Button,
  Chip,
  Divider,
  Paper,
  Stack,
  Tab,
  Tabs,
  Typography,
  ThemeProvider,
} from '@mui/material';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import BuilderAppBar from './layout/BuilderAppBar.jsx';
import PreviewPane from './preview/PreviewPane.jsx';
import { STEPS } from './constants.js';
import { useBuilderData } from './state/useBuilderData.js';
import { useBuilderAdapters } from './state/useBuilderAdapters.js';
import { useBuilderPersistence } from './state/useBuilderPersistence.js';
import { createInitialBuilderState } from './state/builderStartup.js';
import BuilderDataAlert from './layout/BuilderDataAlert.jsx';
import { builderRootSx, builderTheme } from './layout/builderTheme.js';
import { builderReducer } from './state/state.js';
import BackgroundStep from './steps/BackgroundStep.jsx';
import ClassStep from './steps/ClassStep.jsx';
import EquipmentStep from './steps/EquipmentStep.jsx';
import ScoresStep from './steps/ScoresStep.jsx';
import SheetStep from './steps/SheetStep.jsx';
import SpeciesStep from './steps/SpeciesStep.jsx';
import { useToast } from '../../shared/ui/ToastProvider.jsx';
import SheetConflictBanner from '../../shared/ui/SheetConflictBanner.jsx';
import { UI_COLORS } from '../../shared/ui/colors.js';
import { FONT_SIZES } from '../../shared/ui/fonts.js';
import { TEXT_STYLES } from '../../shared/ui/textStyles.js';

function StepLabel({ step, index }) {
  const Icon = step.icon;
  return (
    <Stack direction="row" spacing={0.65} sx={{ alignItems: 'center', minWidth: 0 }}>
      <Chip size="small" label={index + 1} sx={{ height: 18, fontSize: FONT_SIZES.xxs }} />
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

export default function CharBuilder() {
  const [state, dispatch] = useReducer(builderReducer, undefined, createInitialBuilderState);
  const { notify } = useToast();
  const activeStep = STEPS[state.tab];
  const ActiveIcon = activeStep.icon;
  const {
    cloudActive,
    cloudConflict,
    importDraft,
    loadCloudVersion,
    keepBuilderVersion,
    handleCloudCopySavedLocally,
    handleUploadToCloud,
    handleDraftLocalSaved,
    handleImportSheetFile,
  } = useBuilderPersistence({ state, dispatch, notify });

  const reloadData = useBuilderData(dispatch);
  useBuilderAdapters(state, dispatch, notify);

  // The class, species and background objects (and every class's features)
  // are rebuilt from the loaded data by `data/adapt`, which runs again after
  // each load and each restored character.

  return (
    <ThemeProvider theme={builderTheme}>
    <Box sx={builderRootSx}>
      <BuilderAppBar
        canUploadDraft={importDraft && cloudActive}
        onUploadDraft={handleUploadToCloud}
        onNotify={notify}
        onImportFile={handleImportSheetFile}
      />

      <Box sx={{ maxWidth: 1360, mx: 'auto', px: { xs: 0.75, md: 1.1 }, py: 1.1 }}>
        <Paper variant="outlined" sx={{ mb: 1, bgcolor: UI_COLORS.surfaceHeader, overflow: 'hidden' }}>
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
            <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', mb: 0.75, color: 'primary.main' }}>
              <ActiveIcon size={16} />
              <Typography variant="h2" sx={{ fontSize: FONT_SIZES.xxl, ...TEXT_STYLES.label, color: 'primary.main' }}>{activeStep.label}</Typography>
              <Chip size="small" label={`${state.tab + 1} / ${STEPS.length}`} sx={{ height: 18, fontSize: FONT_SIZES.xxs }} />
            </Stack>

            <ActiveStep
              state={state}
              dispatch={dispatch}
              sheetProps={{
                importDraft,
                onUploadToCloud: handleUploadToCloud,
                onDraftLocalSaved: handleDraftLocalSaved,
                onCloudCopySavedLocally: handleCloudCopySavedLocally,
                onNotify: notify,
              }}
            />

            <Divider sx={{ my: 1 }} />
            <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
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

        <Typography component="footer" variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 1.4, textAlign: 'center', fontSize: FONT_SIZES.xxs }}>
          Data from 5etools via GitHub mirror - D&D 5e is a trademark of Wizards of the Coast
        </Typography>
      </Box>

    </Box>
    </ThemeProvider>
  );
}
