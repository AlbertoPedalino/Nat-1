import { AppBar, Box, Toolbar, Typography } from '@mui/material';
import { Wand2 } from 'lucide-react';
import ImportSheetFab from './ImportSheetFab.jsx';
import AppTopBar, { APP_TOP_BAR_HEIGHT } from '../../../app/navigation/AppTopBar.jsx';
import { appTopBarButtonSx } from '../../../shared/ui/appBar.js';
import { UI_COLORS } from '../../../shared/ui/colors.js';
import { ICON_SIZES } from '../../../shared/ui/iconSizes.js';
import { BUILDER_TEXT } from './builderText.js';
import { SURFACES } from '../../../shared/ui/surfaces.js';

// The builder's header: the app's top bar (with the cloud menu's draft
// upload) and, under it, the sticky page title with the sheet import.
export default function BuilderAppBar({ canUploadDraft, onUploadDraft, onNotify, onImportFile }) {
  return (
    <>
      <AppTopBar home cloudMenuProps={{ canUploadDraft, onUploadDraft }} />
      <Box sx={{ height: APP_TOP_BAR_HEIGHT }} />
      <AppBar position="sticky" color="default" elevation={0} sx={{ ...SURFACES.pageHeader, top: APP_TOP_BAR_HEIGHT }}>
        <Box sx={{ maxWidth: 1360, width: '100%', mx: 'auto', px: { xs: 0.75, md: 1 } }}>
          <Toolbar disableGutters sx={{ gap: 1, minHeight: '52px !important' }}>
            <Wand2 size={ICON_SIZES.lg} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="h1" noWrap sx={{ ...BUILDER_TEXT.displayTitle, color: UI_COLORS.accentText }}>
                Character Builder
              </Typography>
              <Typography noWrap sx={BUILDER_TEXT.caption}>
                D&D 5e 2024
              </Typography>
            </Box>
            <ImportSheetFab onNotify={onNotify} onFile={onImportFile} buttonSx={appTopBarButtonSx} />
          </Toolbar>
        </Box>
      </AppBar>
    </>
  );
}
