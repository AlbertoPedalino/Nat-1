import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Box, Stack, Typography } from '@mui/material';
import AppTopBar, { APP_TOP_BAR_HEIGHT } from '../../components/AppTopBar.jsx';
import LinkedToolsMenu from '../../components/LinkedToolsMenu.jsx';
import { useSeedInstance } from '../../shared/useSeedInstance.js';
import NoteBoard from './components/NoteBoard.jsx';
import { DmScreenProvider, useDmScreen } from './state/DmScreenContext.jsx';
import { resolveInstance } from './storage.js';

export default function DmScreenPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [instance, setInstance] = useState(() => ({
    ...resolveInstance(location.search),
    sourceSearch: location.search,
  }));

  useEffect(() => {
    if (instance.sourceSearch === location.search) {
      if (instance.replaceSearch) {
        navigate({ pathname: location.pathname, search: instance.replaceSearch }, { replace: true });
      }
      return;
    }
    const next = { ...resolveInstance(location.search), sourceSearch: location.search };
    setInstance(next);
    if (next.replaceSearch) {
      navigate({ pathname: location.pathname, search: next.replaceSearch }, { replace: true });
    }
  }, [instance.sourceSearch, location.pathname, location.search, navigate]);

  const handleInstanceSaved = (entry) => {
    const search = `?screen=${encodeURIComponent(entry.id)}`;
    setInstance((previous) => ({ ...previous, saved: true, sourceSearch: search }));
    navigate({ pathname: location.pathname, search }, { replace: true });
  };

  return (
    <DmScreenProvider
      key={instance.id}
      instanceId={instance.id}
      instanceSaved={instance.saved}
      linkGroupId={instance.linkGroupId}
      onInstanceSaved={handleInstanceSaved}
    >
      <DmScreenShell instance={instance} />
    </DmScreenProvider>
  );
}

function DmScreenShell({ instance }) {
  const { instanceSaved, saveInstance } = useDmScreen();

  useSeedInstance('dmscreen', { instanceId: instance.id, instanceSaved, saveInstance });

  return (
    <Box sx={pageSx}>
      <AppTopBar home backTo="/library/dmscreen" backLabel="DM Screens">
        <LinkedToolsMenu sectionKey="dmscreen" instanceId={instance.id} instanceSaved={instanceSaved} initialLinkGroupId={instance.linkGroupId} />
      </AppTopBar>
      <Box component="main" sx={contentSx}>
        <Stack spacing={2}>
          <Box>
            <Typography variant="h1">DM Screen</Typography>
            <Typography variant="body2" color="text.secondary">
              Screen {instance.id}
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
