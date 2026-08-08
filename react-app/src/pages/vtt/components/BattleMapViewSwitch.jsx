import { Button, MenuItem, Stack, TextField } from '@mui/material';
import { PanelRightClose, ScrollText } from 'lucide-react';
import { VTT_COLORS, vttAlpha } from '../../../shared/vtt/colors.js';

export default function BattleMapViewSwitch({
  view,
  choices,
  selectedId,
  onViewChange,
  onSelectionChange,
}) {
  const hasSheets = choices.length > 0;
  const showingSheet = view === 'sheet';

  return (
    <Stack direction="row" spacing={0.75} sx={rootSx}>
      {showingSheet && choices.length > 1 ? (
        <TextField
          select
          size="small"
          value={selectedId || ''}
          onChange={(event) => onSelectionChange(event.target.value)}
          sx={selectSx}
          slotProps={{ select: { inputProps: { 'aria-label': 'Character sheet' } } }}
        >
          {choices.map((entry) => (
            <MenuItem key={entry.characterId} value={entry.characterId}>
              {entry.name}
            </MenuItem>
          ))}
        </TextField>
      ) : null}

      <Button
        size="small"
        variant={showingSheet ? 'contained' : 'outlined'}
        startIcon={showingSheet ? <PanelRightClose size={14} /> : <ScrollText size={14} />}
        disabled={!hasSheets}
        title={hasSheets ? undefined : 'No character sheet is available to you.'}
        aria-label={showingSheet ? 'Hide character sheet' : 'Show character sheet'}
        onClick={() => onViewChange(showingSheet ? 'map' : 'sheet')}
        sx={buttonSx}
      >
        Sheet
      </Button>
    </Stack>
  );
}

const rootSx = {
  ml: 'auto',
  alignItems: 'center',
  flexShrink: 0,
};

const selectSx = {
  width: { xs: 148, sm: 210 },
  '& .MuiInputBase-root': {
    height: 32,
    bgcolor: vttAlpha(VTT_COLORS.overlaySurface, 0.72),
    fontSize: '0.73rem',
  },
};

const buttonSx = {
  minWidth: 92,
  height: 32,
  fontFamily: '"Cinzel", Georgia, serif',
  fontSize: '0.65rem',
  letterSpacing: '0.08em',
};
