import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Box, Stack, Tab, Tabs, Typography } from '@mui/material';
import { Map, Castle, ScrollText, Table, BookOpen } from 'lucide-react';
import AppTopBar, { APP_TOP_BAR_HEIGHT } from '../../components/AppTopBar.jsx';
import SaveInstanceButton from '../../components/SaveInstanceButton.jsx';
import { useToast } from '../../shared/ToastProvider.jsx';
import { resolveInstance } from './storage.js';
import { GmBoardProvider, useGmBoard } from './state/GmBoardContext.jsx';
import HexcrawlView from './components/HexcrawlView.jsx';
import DungeonView from './components/DungeonView.jsx';
import QuestView from './components/QuestView.jsx';
import TablesView from './components/TablesView.jsx';
import GuideView from './components/GuideView.jsx';

const TABS = [
  { value: 'hex', label: 'Hexcrawl', Icon: Map },
  { value: 'dungeon', label: 'Dungeon', Icon: Castle },
  { value: 'quest', label: 'Quest', Icon: ScrollText },
  { value: 'editor', label: 'Tables', Icon: Table },
  { value: 'guide', label: 'Guide', Icon: BookOpen },
];

export default function GmBoardPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [instance, setInstance] = useState(() => resolveInstance(location.search));

  useEffect(() => {
    const next = resolveInstance(location.search);
    setInstance(next);
    if (next.replaceSearch) {
      navigate({ pathname: location.pathname, search: next.replaceSearch }, { replace: true });
    }
  }, [location.pathname, location.search, navigate]);

  return (
    <GmBoardProvider
      key={instance.id}
      instanceId={instance.id}
      instanceSaved={instance.saved}
      onInstanceSaved={() => setInstance((prev) => ({ ...prev, saved: true }))}
    >
      <GmBoardShell instance={instance} />
    </GmBoardProvider>
  );
}

function GmBoardShell({ instance }) {
  const { state, dispatch, saveInstance, instanceSaved } = useGmBoard();
  const { notify } = useToast();

  const handleSaveInstance = () => {
    const entry = saveInstance();
    if (entry) notify('success', 'GM Board instance saved locally.');
  };

  return (
    <Box sx={pageSx}>
      <AppTopBar home>
        <SaveInstanceButton saved={instanceSaved} onClick={handleSaveInstance} />
      </AppTopBar>
      <Box sx={contentSx}>
        <Stack spacing={2}>
          <Box>
            <Typography variant="h1">GM Board</Typography>
            <Typography variant="body2" color="text.secondary">Instance {instance.id}</Typography>
          </Box>
          <Tabs
            value={state.tab}
            onChange={(_, value) => dispatch({ type: 'setTab', tab: value })}
            variant="scrollable"
            allowScrollButtonsMobile
            aria-label="GM Board sections"
          >
            {TABS.map((t) => (
              <Tab
                key={t.value}
                icon={<t.Icon size={15} />}
                iconPosition="start"
                value={t.value}
                label={t.label}
                id={`gmboard-tab-${t.value}`}
                aria-controls={`gmboard-tabpanel-${t.value}`}
              />
            ))}
          </Tabs>
          <Box
            role="tabpanel"
            id={`gmboard-tabpanel-${state.tab}`}
            aria-labelledby={`gmboard-tab-${state.tab}`}
            tabIndex={0}
            sx={tabPanelSx}
          >
            {state.tab === 'hex' ? <HexcrawlView /> : null}
            {state.tab === 'dungeon' ? <DungeonView /> : null}
            {state.tab === 'quest' ? <QuestView /> : null}
            {state.tab === 'editor' ? <TablesView /> : null}
            {state.tab === 'guide' ? <GuideView /> : null}
          </Box>
        </Stack>
      </Box>
    </Box>
  );
}

const pageSx = {
  minHeight: '100vh',
  bgcolor: 'background.default',
  pt: APP_TOP_BAR_HEIGHT,
};

const contentSx = {
  maxWidth: 1200,
  mx: 'auto',
  px: { xs: 1.25, md: 2 },
  py: 2,
};

const tabPanelSx = {
  '&:focus-visible': {
    outline: (theme) => `2px solid ${theme.palette.primary.main}`,
    outlineOffset: '2px',
  },
};
