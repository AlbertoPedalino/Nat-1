import { useMemo, useState } from 'react';
import { Box, Button, Stack, Tab, Tabs, Typography, useTheme } from '@mui/material';
import { AlertTriangle, CloudRain, Coins, Flame, Leaf, Map, RotateCcw, Swords, Table as TableIcon } from 'lucide-react';
import TableEditorGrid from './TableEditorGrid.jsx';
import { EDITOR_TABS } from '../logic/constants.js';
import { confirmDiscard } from '../logic/confirmDiscard.js';
import { useGmBoard } from '../state/GmBoardContext.jsx';
import { useToast } from '../../../shared/ToastProvider.jsx';

const WEATHER_COLUMNS = [
  { field: 's', label: 'Season', editable: false },
  { field: 'sole', label: 'Clear ≤', editable: true, numeric: true },
  { field: 'pioggia', label: 'Rain ≤', editable: true, numeric: true },
];
const EVENT_COLUMNS = [
  { field: 'r', label: 'Roll', editable: false },
  { field: 'name', label: 'Name', editable: true },
  { field: 'type', label: 'Type', editable: true },
];
const LOOT_COLUMNS = [
  { field: 'r', label: 'Roll', editable: false },
  { field: 'tipo', label: 'Type', editable: true },
  { field: 'rarita', label: 'Rarity', editable: true },
  { field: 'qualita', label: 'Quality', editable: true },
  { field: 'valore', label: 'Value', editable: true },
  { field: 'extra', label: 'Extra', editable: true },
];
const COMPL_COLUMNS = [
  { field: 'r', label: 'Roll', editable: false },
  { field: 'type', label: 'Type', editable: true },
];
const ENC_COLUMNS = [
  { field: 'r', label: 'Roll', editable: false },
  { field: 'diff', label: 'Difficulty', editable: true },
  { field: 'lv', label: 'Level', editable: true },
  { field: 'xp', label: 'XP', editable: true, numeric: true },
];
const TRAP_COLUMNS = [
  { field: 'r', label: 'Roll', editable: false },
  { field: 'tipo', label: 'Type', editable: true },
  { field: 'lv', label: 'Level', editable: true },
  { field: 'dc', label: 'DC', editable: true, numeric: true },
  { field: 'danno', label: 'Damage', editable: true },
];
const ENV_COLUMNS = [
  { field: 'r', label: 'Roll', editable: false },
  { field: 'gravita', label: 'Severity', editable: true },
];

function resolveEditorSource(editorId, tables) {
  if (editorId === 'ed-weather') return { rows: tables.weather, tableKey: 'weather', matchField: 's', columns: WEATHER_COLUMNS };
  if (editorId === 'ed-event') return { rows: tables.events, tableKey: 'events', matchField: 'r', columns: EVENT_COLUMNS };
  if (editorId === 'ed-loot') return { rows: tables.loot, tableKey: 'loot', matchField: 'r', columns: LOOT_COLUMNS };
  if (editorId === 'ed-compl') return { rows: tables.compl, tableKey: 'compl', matchField: 'r', columns: COMPL_COLUMNS };
  if (editorId === 'ed-env') return { rows: tables.env, tableKey: 'env', matchField: 'r', columns: ENV_COLUMNS };
  const encMatch = /^ed-enc(\d)$/.exec(editorId);
  if (encMatch) {
    const tier = Number(encMatch[1]) - 1;
    return { rows: tables.enc[tier], tableKey: `enc${tier}`, matchField: 'r', columns: ENC_COLUMNS };
  }
  const trapMatch = /^ed-trap(\d)$/.exec(editorId);
  if (trapMatch) {
    const tier = Number(trapMatch[1]) - 1;
    return { rows: tables.trap[tier], tableKey: `trap${tier}`, matchField: 'r', columns: TRAP_COLUMNS };
  }
  return { rows: [], tableKey: null, matchField: 'r', columns: [] };
}

function editorIcon(tab) {
  if (tab.id === 'ed-weather') return CloudRain;
  if (tab.id === 'ed-event') return Map;
  if (tab.id === 'ed-loot') return Coins;
  if (tab.id === 'ed-compl') return AlertTriangle;
  if (tab.id === 'ed-env') return Leaf;
  if (tab.id.startsWith('ed-enc')) return Swords;
  if (tab.id.startsWith('ed-trap')) return Flame;
  return TableIcon;
}

export default function TablesView() {
  const { state, dispatch, resetTables } = useGmBoard();
  const { notify } = useToast();
  const theme = useTheme();
  const [editorId, setEditorId] = useState(EDITOR_TABS[0].id);

  const activeTab = EDITOR_TABS.find((tab) => tab.id === editorId) || EDITOR_TABS[0];
  const ActiveIcon = editorIcon(activeTab);
  const source = useMemo(() => resolveEditorSource(editorId, state.tables), [editorId, state.tables]);

  const handleEdit = (matchValue, field, value) => {
    dispatch({ type: 'editTableCell', tableKey: source.tableKey, matchField: source.matchField, matchValue, field, value });
  };

  const handleReset = () => {
    if (!confirmDiscard('Reset all tables to their default values?')) return;
    resetTables();
    notify('success', 'Tables reset to defaults.');
  };

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" rowGap={0.5}>
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
          rows={source.rows}
          columns={source.columns}
          matchField={source.matchField}
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
  fontFamily: '"Cinzel", Georgia, serif',
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
