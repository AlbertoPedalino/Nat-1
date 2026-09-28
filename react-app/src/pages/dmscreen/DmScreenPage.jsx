import { Box, Stack, Typography } from '@mui/material';
import AppTopBar, { APP_TOP_BAR_HEIGHT } from '../../app/navigation/AppTopBar.jsx';
import LinkedToolsMenu from '../../app/navigation/LinkedToolsMenu.jsx';
import { useToolInstance } from '../../shared/instances/useToolInstance.js';
import CloudInstanceLoading from '../../shared/instances/CloudInstanceLoading.jsx';
import InstanceConflictBanner from '../../shared/instances/InstanceConflictBanner.jsx';
import NoteBoard from './notes/NoteBoard.jsx';
import { DmScreenProvider } from './state/DmScreenContext.jsx';

export default function DmScreenPage() {
  const tool = useToolInstance('dmscreen');
  if (!tool.ready) return <CloudInstanceLoading label="DM Screen" />;

  return (
    <DmScreenProvider key={`${tool.id}:${tool.revision}`} instanceId={tool.id}>
      <DmScreenShell tool={tool} />
    </DmScreenProvider>
  );
}

function DmScreenShell({ tool }) {
  return (
    <Box sx={pageSx}>
      <AppTopBar home backTo="/library/dmscreen" backLabel="DM Screens">
        <LinkedToolsMenu sectionKey="dmscreen" instanceId={tool.id} initialLinkGroupId={tool.linkGroupId} />
      </AppTopBar>
      <Box component="main" sx={contentSx}>
        <Stack spacing={2}>
          <InstanceConflictBanner tool={tool} />
          <Box>
            <Typography variant="h1">DM Screen</Typography>
            <Typography variant="body2" color="text.secondary">
              Screen {tool.id}
            </Typography>
          </Box>
          <NoteBoard />
        </Stack>
      </Box>
    </Box>
  );
}

const pageSx = {
  minHeight: '100vh',
  minWidth: 0,
  overflowX: 'hidden',
  bgcolor: 'background.default',
  pt: APP_TOP_BAR_HEIGHT,
};

const contentSx = {
  width: 1,
  maxWidth: 1500,
  mx: 'auto',
  px: { xs: 1.25, md: 2 },
  py: 2,
  boxSizing: 'border-box',
};
