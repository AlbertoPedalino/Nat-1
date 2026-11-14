import { useMemo, useReducer } from 'react';
import { Box, Button, Divider, Paper, Stack, Tab, Tabs, Typography } from '@mui/material';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import AppPage from '../../app/navigation/AppPage.jsx';
import PageHeader from '../../shared/ui/PageHeader.jsx';
import ImportSheetFab from './layout/ImportSheetFab.jsx';
import PreviewPane from './preview/PreviewPane.jsx';
import { STEPS } from './constants.js';
import { useBuilderData } from './state/useBuilderData.js';
import { useBuilderAdapters } from './state/useBuilderAdapters.js';
import { useBuilderPersistence } from './state/useBuilderPersistence.js';
import { createInitialBuilderState } from './state/builderStartup.js';
import BuilderDataAlert from './layout/BuilderDataAlert.jsx';
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
import { ICON_SIZES } from '../../shared/ui/iconSizes.js';
import { builderDataForBooks } from '../../shared/content/booksView.js';
import { BUILDER_TEXT } from './layout/builderText.js';
import { useIsPhone } from '../../shared/ui/useIsPhone.js';
import { panelFrameSx, panelTitleBarSx } from '../../shared/ui/PanelHeader.jsx';
import TagChip from '../../shared/ui/TagChip.jsx';
import { TOOL_CATALOG } from '../../app/navigation/toolCatalog.js';

// A step's tab: its number and its name. No picture: at a tab's size the
// drawings read as specks; the step's own heading carries it.
function StepLabel({ step, index }) {
  return (
    <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', minWidth: 0 }}>
      <TagChip label={index + 1} />
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
  const isPhone = useIsPhone();
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
  // What the steps offer comes from the books the character is built from;
  // the reducer keeps the full data, which finds earlier picks of any book.
  const viewState = useMemo(
    () => ({ ...state, data: builderDataForBooks(state.data, state.character) }),
    [state],
  );

  // The class, species and background objects (and every class's features)
  // are rebuilt from the loaded data by `data/adapt`, which runs again after
  // each load and each restored character.

  return (
    // The cloud menu offers to upload an imported draft.
    <AppPage
      dense
      maxWidth={1360}
      topBar={{ home: true, cloudMenuProps: { canUploadDraft: importDraft && cloudActive, onUploadDraft: handleUploadToCloud } }}
    >
      <PageHeader
        tool={TOOL_CATALOG.builder}
        title="Character Builder"
        subtitle="D&D 5.5e"
        actions={<ImportSheetFab onNotify={notify} onFile={handleImportSheetFile} />}
        sx={{ mb: 1 }}
      />
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) 320px', xl: 'minmax(0, 1fr) 360px' },
          alignItems: 'start',
          gap: 1,
        }}
      >
        {/* The steps head the left column, level with the preview's top. */}
        <Box sx={{ minWidth: 0 }}>
          {/* The steps' bar: a panel's bar, as the sheet's tab bar. */}
          <Paper variant="outlined" sx={{ ...panelFrameSx, mb: 1 }}>
            <Box sx={{ ...panelTitleBarSx(UI_COLORS.accent), py: 0, borderBottom: 0 }}>
              <Tabs
                sx={{ flex: 1, minWidth: 0 }}
                value={state.tab}
                onChange={(_, tab) => dispatch({ type: 'tab/set', tab })}
                // The steps fill the bar; on a phone, too narrow for six, they scroll.
                variant={isPhone ? 'scrollable' : 'fullWidth'}
                scrollButtons="auto"
                aria-label="Character builder steps"
              >
                {STEPS.map((step, index) => (
                  <Tab key={step.id} label={<StepLabel step={step} index={index} />} />
                ))}
              </Tabs>
            </Box>
          </Paper>
          <BuilderDataAlert errors={state.errors} onRetry={reloadData} />
          {cloudConflict ? (
            <SheetConflictBanner subject="character" onLoadRemote={loadCloudVersion} onKeepLocal={keepBuilderVersion} />
          ) : null}
          <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', mb: 0.75, color: 'primary.main' }}>
            <ActiveIcon size={ICON_SIZES.md} />
            <Typography variant="h2" sx={{ ...BUILDER_TEXT.stepTitle, color: 'primary.main' }}>{activeStep.label}</Typography>
            <TagChip label={`${state.tab + 1} / ${STEPS.length}`} />
          </Stack>

          <ActiveStep
            state={viewState}
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
              startIcon={<ChevronLeft size={ICON_SIZES.md} />}
              disabled={state.tab === 0}
              onClick={() => dispatch({ type: 'tab/set', tab: Math.max(0, state.tab - 1) })}
            >
              Back
            </Button>
            <Button
              variant="contained"
              endIcon={<ChevronRight size={ICON_SIZES.md} />}
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

      <Typography component="footer" sx={{ ...BUILDER_TEXT.caption, mt: 1.5, textAlign: 'center' }}>
        Data from 5etools via GitHub mirror - D&D 5e is a trademark of Wizards of the Coast
      </Typography>
    </AppPage>
  );
}
