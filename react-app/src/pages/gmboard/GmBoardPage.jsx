import { Box, Tab, Tabs } from '@mui/material';
import { Map, Table } from 'lucide-react';
import ToolPageShell from '../../app/navigation/ToolPageShell.jsx';
import { useToolInstance } from '../../shared/instances/useToolInstance.js';
import CloudInstanceLoading from '../../shared/instances/CloudInstanceLoading.jsx';
import { GmBoardProvider, useGmBoard } from './state/GmBoardContext.jsx';
import HexcrawlView from './hexcrawl/HexcrawlView.jsx';
import DungeonView from './dungeon/DungeonView.jsx';
import QuestView from './quests/QuestView.jsx';
import RollView from './tables/RollView.jsx';
import TablesView from './tables/TablesView.jsx';
import GuideView from './ui/GuideView.jsx';
import { ICON_SIZES } from '../../shared/ui/iconSizes.js';
import { focusRingSx } from '../../shared/ui/interactive.js';
import { GAME_ICONS } from '../../shared/ui/gameIcons.js';

const TABS = [
  { value: 'hex', label: 'Hexcrawl', Icon: Map },
  { value: 'dungeon', label: 'Dungeon', Icon: GAME_ICONS.dungeon },
  { value: 'quest', label: 'Quest', Icon: GAME_ICONS.quest },
  { value: 'roll', label: 'Roll', Icon: GAME_ICONS.roll },
  { value: 'editor', label: 'Tables', Icon: Table },
  { value: 'guide', label: 'Guide', Icon: GAME_ICONS.reference },
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
    <ToolPageShell
      tool={tool}
      sectionKey="gmboard"
      title="GM Board"
      backTo="/library/gmboard"
      backLabel="GM Boards"
    >
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
            icon={<t.Icon size={ICON_SIZES.sm} />}
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
    </ToolPageShell>
  );
}

const tabPanelSx = focusRingSx();
