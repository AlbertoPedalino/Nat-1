import { Box, Stack, Tab, Tabs, Typography } from '@mui/material';
import { Map, Castle, ScrollText, Dices, Table, BookOpen } from 'lucide-react';
import AppTopBar, { APP_TOP_BAR_HEIGHT } from '../../app/navigation/AppTopBar.jsx';
import LinkedToolsMenu from '../../app/navigation/LinkedToolsMenu.jsx';
import { useToolInstance } from '../../shared/instances/useToolInstance.js';
import CloudInstanceLoading from '../../shared/instances/CloudInstanceLoading.jsx';
import InstanceConflictBanner from '../../shared/instances/InstanceConflictBanner.jsx';
import { GmBoardProvider, useGmBoard } from './state/GmBoardContext.jsx';
import HexcrawlView from './hexcrawl/HexcrawlView.jsx';
import DungeonView from './dungeon/DungeonView.jsx';
import QuestView from './quests/QuestView.jsx';
import RollView from './tables/RollView.jsx';
import TablesView from './tables/TablesView.jsx';
import GuideView from './ui/GuideView.jsx';

const TABS = [
  { value: 'hex', label: 'Hexcrawl', Icon: Map },
  { value: 'dungeon', label: 'Dungeon', Icon: Castle },
  { value: 'quest', label: 'Quest', Icon: ScrollText },
  { value: 'roll', label: 'Roll', Icon: Dices },
  { value: 'editor', label: 'Tables', Icon: Table },
  { value: 'guide', label: 'Guide', Icon: BookOpen },
];

export default function GmBoardPage() {
  const tool = useToolInstance('gmboard');
  if (!tool.ready) return <CloudInstanceLoading label="GM Board" />;

  return (
    <GmBoardProvider key={`${tool.id}:${tool.revision}`} instanceId={tool.id}>
      <GmBoardShell tool={tool} />
    </GmBoardProvider>
  );
}

function GmBoardShell({ tool }) {
  const { state, dispatch } = useGmBoard();

  return (
    <Box sx={pageSx}>
      <AppTopBar home backTo="/library/gmboard" backLabel="GM Boards">
        <LinkedToolsMenu sectionKey="gmboard" instanceId={tool.id} initialLinkGroupId={tool.linkGroupId} />
      </AppTopBar>
      <Box sx={contentSx}>
        <Stack spacing={2}>
          <InstanceConflictBanner tool={tool} />
          <Box>
            <Typography variant="h1">GM Board</Typography>
            <Typography variant="body2" color="text.secondary">Instance {tool.id}</Typography>
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
            {state.tab === 'roll' ? <RollView /> : null}
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
