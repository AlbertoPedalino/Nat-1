import { Box, Paper, Tabs, Tab } from '@mui/material';
import ActionsTab from '../actions/ActionsTab.jsx';
import SpellsTab from '../spells/SpellsTab.jsx';
import InventoryTab from '../inventory/InventoryTab.jsx';
import FeaturesTab from '../details/FeaturesTab.jsx';
import NotesTab from '../details/NotesTab.jsx';
import { FONT_SIZES } from '../../../shared/ui/fonts.js';
import { PANEL_BADGE_ICON, panelBadgeSx, panelFrameSx, panelTitleBarSx } from '../../../shared/ui/PanelHeader.jsx';
import { GAME_ICONS } from '../../../shared/ui/gameIcons.js';

const TABS = ['Actions', 'Spells', 'Inventory', 'Features', 'Notes'];

export default function TabsPanel({ C, sheet, tab, setTab, resources, freeCastUses }) {
  const handleChange = (_, v) => setTab(v);

  return (
    <Paper variant="outlined" sx={panelFrameSx}>
      {/* The tab bar is the panel's bar: its badge, its screentone. */}
      <Box sx={panelTitleBarSx()}>
        <Box sx={panelBadgeSx()}><GAME_ICONS.actions size={PANEL_BADGE_ICON} /></Box>
        <Tabs value={tab} onChange={handleChange} variant="scrollable" scrollButtons="auto"
          sx={{ minHeight: 0, '& .MuiTab-root': { minHeight: 0, py: 1, px: 1.5, fontSize: FONT_SIZES.sm } }}>
          {TABS.map(t => <Tab key={t} label={t} />)}
        </Tabs>
      </Box>
      <Box sx={{ p: '0.62rem' }}>
        {tab === 0 && <ActionsTab C={C} sheet={sheet} resources={resources} />}
        {tab === 1 && <SpellsTab C={C} sheet={sheet} resources={resources} freeCastUses={freeCastUses} />}
        {tab === 2 && <InventoryTab C={C} sheet={sheet} />}
        {tab === 3 && <FeaturesTab C={C} />}
        {tab === 4 && <NotesTab sheet={sheet} />}
      </Box>
    </Paper>
  );
}
