import { AppBar, Box, Toolbar, Typography } from '@mui/material';
import { Wand2 } from 'lucide-react';
import ImportSheetFab from './ImportSheetFab.jsx';
import AppTopBar, { APP_TOP_BAR_HEIGHT } from '../../../app/navigation/AppTopBar.jsx';
import { appTopBarButtonSx } from '../../../shared/ui/appBar.js';
import { UI_COLORS, uiAlpha, OPACITY } from '../../../shared/ui/colors.js';
import { FONT_SIZES, LETTER_SPACINGS } from '../../../shared/ui/fonts.js';
import { ICON_SIZES } from '../../../shared/ui/iconSizes.js';

// The builder's header: the app's top bar (with sheet import and the cloud
// menu's draft upload) and, under it, the sticky page title.
export default function BuilderAppBar({ canUploadDraft, onUploadDraft, onNotify, onImportFile }) {
  return (
    <>
      <AppTopBar home cloudMenuProps={{ canUploadDraft, onUploadDraft }}>
        <ImportSheetFab onNotify={onNotify} onFile={onImportFile} buttonSx={appTopBarButtonSx} />
      </AppTopBar>
      <Box sx={{ height: APP_TOP_BAR_HEIGHT }} />
      <AppBar position="sticky" color="default" elevation={0} sx={{ top: APP_TOP_BAR_HEIGHT, borderBottom: 1, borderColor: 'divider', bgcolor: uiAlpha(UI_COLORS.surfaceDeep, OPACITY.solid), backgroundImage: 'none' }}>
        <Box sx={{ maxWidth: 1360, width: '100%', mx: 'auto', px: { xs: 0.75, md: 1 } }}>
          <Toolbar disableGutters sx={{ gap: 1, minHeight: '52px !important', pr: { xs: 12, md: 16 } }}>
            <Wand2 size={ICON_SIZES.lg} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="h1" noWrap sx={{ fontSize: FONT_SIZES.lead, letterSpacing: LETTER_SPACINGS.sm, color: UI_COLORS.accentText }}>
                Character Builder
              </Typography>
              <Typography variant="body2" noWrap sx={{ color: 'text.secondary', fontSize: FONT_SIZES.xs }}>
                D&D 5e 2024
              </Typography>
            </Box>
          </Toolbar>
        </Box>
      </AppBar>
    </>
  );
}
