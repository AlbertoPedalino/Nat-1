import { useState } from 'react';
import { Box, Paper, Tabs, Tab } from '@mui/material';
import ActionsTab from './ActionsTab.jsx';
import SpellsTab from './SpellsTab.jsx';
import InventoryTab from './InventoryTab.jsx';
import FeaturesTab from './FeaturesTab.jsx';
import NotesTab from './NotesTab.jsx';

const TABS = ['Actions', 'Spells', 'Inventory', 'Features', 'Notes'];

export default function TabsPanel({ C, sheet, tab, setTab, resources, freeCastUses }) {
  const handleChange = (_, v) => setTab(v);

  return (
    <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
        <Tabs value={tab} onChange={handleChange} variant="scrollable" scrollButtons="auto"
          sx={{ minHeight: 0, '& .MuiTab-root': { minHeight: 0, py: 1, px: 1.5, fontSize: '0.65rem', fontFamily: '"Cinzel", Georgia, serif', letterSpacing: '0.1em' } }}>
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
