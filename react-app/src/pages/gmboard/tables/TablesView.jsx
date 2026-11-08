import { useMemo, useState } from 'react';
import { Box, Button, Stack, Tab, Tabs, Typography, useTheme } from '@mui/material';
import { RotateCcw } from 'lucide-react';
import TableEditorGrid from './TableEditorGrid.jsx';
import { EDITOR_TABS } from './tableCatalog.js';
import { tableRows } from '../../../shared/gmboard/tables.js';
import { confirmAction } from '../../../shared/ui/confirmAction.js';
import { useGmBoard } from '../state/GmBoardContext.jsx';
import { useToast } from '../../../shared/ui/ToastProvider.jsx';
import { UI_FONTS } from '../../../shared/ui/fonts.js';

export default function TablesView() {
  const { state, dispatch } = useGmBoard();
  const { notify } = useToast();
  const theme = useTheme();
  const [editorId, setEditorId] = useState(EDITOR_TABS[0].id);

  const activeTab = EDITOR_TABS.find((tab) => tab.id === editorId) || EDITOR_TABS[0];
  const ActiveIcon = activeTab.icon;
  const rows = useMemo(
    () => tableRows(state.tables, activeTab.tableId, activeTab.tier || 1),
    [activeTab, state.tables],
  );

  const handleEdit = (matchValue, field, value) => {
    dispatch({
      type: 'editTableCell', tableId: activeTab.tableId, tier: activeTab.tier || 1, matchValue, field, value,
    });
  };

  const handleReset = () => {
    if (!confirmAction('Reset all tables to their default values?')) return;
    dispatch({ type: 'resetTables' });
    notify('success', 'Tables reset to defaults.');
  };

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 0.5 }}>
        <Button size="small" variant="outlined" color="error" startIcon={<RotateCcw size={14} />} onClick={handleReset}>
          Reset to defaults
        </Button>
        <Typography sx={saveHintSx}>Table edits save automatically.</Typography>
      </Stack>

      <Tabs
        value={editorId}
        onChange={(_, value) => setEditorId(value)}
        variant="scrollable"
        allowScrollButtonsMobile
        aria-label="Table editors"
        sx={tabsSx}
      >
        {EDITOR_TABS.map((tab) => (
          <Tab
            key={tab.id}
            value={tab.id}
            sx={tabSx}
            aria-label={`${tab.label} — feeds ${tab.feeds}`}
            label={
              <Box sx={tabLabelSx}>
                <Box component="span" sx={tabGroupSx}>{tab.group}</Box>
                <Box component="span" sx={tabNameSx}>{tab.label}</Box>
              </Box>
            }
          />
        ))}
      </Tabs>

      <Box sx={{ ...activeHeaderSx, bgcolor: theme.palette.gmboard.panelOverlay }}>
        <ActiveIcon size={16} color={theme.palette.primary.main} />
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={activeNameSx}>{activeTab.tableName}</Typography>
          <Typography sx={activeMetaSx}>Roll: {activeTab.roll} · Feeds: {activeTab.feeds}</Typography>
        </Box>
      </Box>

      <Box>
        <TableEditorGrid
          rows={rows}
          columns={activeTab.columns}
          matchField={activeTab.matchField}
          onEdit={handleEdit}
          tableLabel={activeTab.tableName}
        />
      </Box>
    </Stack>
  );
}

const tabsSx = {
  minHeight: '48px',
};

const tabSx = {
  minHeight: '48px',
  alignItems: 'flex-start',
  textAlign: 'left',
  textTransform: 'none',
};

const tabLabelSx = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  lineHeight: 1.3,
};

const tabGroupSx = {
  fontSize: '0.56rem',
  letterSpacing: '0.05em',
  textTransform: 'uppercase',
  color: 'text.secondary',
};

const tabNameSx = {
  fontSize: '0.7rem',
  color: 'inherit',
};

const activeHeaderSx = {
  display: 'flex',
  alignItems: 'center',
  gap: 1,
  p: 1,
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 2,
};

const activeNameSx = {
  fontFamily: UI_FONTS.display,
  fontSize: '0.8rem',
  color: 'primary.main',
};

const activeMetaSx = {
  fontSize: '0.68rem',
  color: 'text.secondary',
};

const saveHintSx = {
  fontSize: '0.7rem',
  color: 'text.secondary',
  flexBasis: '100%',
};
