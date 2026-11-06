import { Link as RouterLink } from 'react-router-dom';
import { AppBar, Box, Button, Toolbar, Typography } from '@mui/material';
import { Home, Wand2 } from 'lucide-react';
import ImportSheetFab from './ImportSheetFab.jsx';
import CloudMenu from '../../../shared/cloud/auth/CloudMenu.jsx';
import CompendiumButton from '../../compendium/CompendiumButton.jsx';
import { UI_COLORS, uiAlpha } from '../../../shared/ui/colors.js';
import { UI_FONTS } from '../../../shared/ui/fonts.js';

// The builder's sticky header: app navigation, cloud menu, sheet import and
// the page title.
export default function BuilderAppBar({ canUploadDraft, onUploadDraft, onNotify, onImportFile }) {
  return (
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
            canUploadDraft={canUploadDraft}
            onUploadDraft={onUploadDraft}
          />
          <ImportSheetFab
            onNotify={onNotify}
            onFile={onImportFile}
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
