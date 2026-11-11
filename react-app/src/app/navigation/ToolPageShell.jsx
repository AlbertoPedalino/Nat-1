import { Box, Stack, Typography } from '@mui/material';
import AppTopBar, { APP_TOP_BAR_HEIGHT } from './AppTopBar.jsx';
import LinkedToolsMenu from './LinkedToolsMenu.jsx';
import InstanceConflictBanner from '../../shared/instances/InstanceConflictBanner.jsx';
import { asArray } from '../../shared/lists.js';
import { SURFACES } from '../../shared/ui/surfaces.js';

// The frame of a saved tool's page (GM Board, Encounter Builder, DM Screen):
// the top bar with Home, Back to the tool's list and the Links menu, the
// conflict banner, the title with the instance id, and the page's content.
//
// `actions` sit beside the title (below it on a phone); `children` is the
// content; `after` is what lives outside the column (dialogs, toasts).
// `maxWidth` is the column's width; `sx` adds to the page box.
export default function ToolPageShell({
  tool, sectionKey, title, backTo, backLabel, actions = null, maxWidth = 1500, sx, children, after = null,
}) {
  return (
    <Box sx={[pageSx, ...asArray(sx)]}>
      <AppTopBar home backTo={backTo} backLabel={backLabel}>
        <LinkedToolsMenu sectionKey={sectionKey} instanceId={tool.id} initialLinkGroupId={tool.linkGroupId} />
      </AppTopBar>
      <Box component="main" sx={{ ...contentSx, maxWidth }}>
        <Stack spacing={2}>
          <InstanceConflictBanner tool={tool} />
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={1.5}
            sx={{ alignItems: { xs: 'stretch', md: 'center' }, justifyContent: 'space-between' }}
          >
            <Box>
              <Typography variant="h1">{title}</Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>Instance {tool.id}</Typography>
            </Box>
            {actions}
          </Stack>
          {children}
        </Stack>
      </Box>
      {after}
    </Box>
  );
}

const pageSx = {
  ...SURFACES.page,
  minHeight: '100vh',
  minWidth: 0,
  pt: APP_TOP_BAR_HEIGHT,
};

const contentSx = {
  width: 1,
  mx: 'auto',
  px: { xs: 1.25, md: 2 },
  py: 2,
  boxSizing: 'border-box',
};
