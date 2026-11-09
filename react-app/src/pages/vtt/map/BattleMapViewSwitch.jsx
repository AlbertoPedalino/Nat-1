import { Button, MenuItem, Stack, TextField } from '@mui/material';
import { PanelRightClose, ScrollText } from 'lucide-react';
import { VTT_COLORS, vttAlpha } from '../../../shared/vtt/colors.js';
import { FONT_SIZES } from '../../../shared/ui/fonts.js';
import { TEXT_STYLES } from '../../../shared/ui/textStyles.js';
import { OPACITY } from '../../../shared/ui/colors.js';
import { ICON_SIZES } from '../../../shared/ui/iconSizes.js';
import { CONTROL_HEIGHTS } from '../../../shared/ui/controlHeights.js';

export default function BattleMapViewSwitch({
  view,
  choices,
  selectedId,
  onViewChange,
  onSelectionChange,
  // Whether there is anything to show, when that is more than the characters
  // (a creature's stat block).
  available = choices.length > 0,
}) {
  const hasSheets = available;
  const showingSheet = view === 'sheet';
  // No character picked: something else (a stat block) is on show, and the
  // selector is the way back to a character, even to the only one.
  const picked = choices.some((entry) => entry.characterId === selectedId);

  return (
    <Stack direction="row" spacing={0.75} sx={rootSx}>
      {showingSheet && (choices.length > 1 || (choices.length && !picked)) ? (
        <TextField
          select
          size="small"
          value={picked ? selectedId : ''}
          onChange={(event) => onSelectionChange(event.target.value)}
          sx={selectSx}
          slotProps={{
            select: {
              displayEmpty: true,
              renderValue: (value) => choices.find((entry) => entry.characterId === value)?.name || 'Character…',
              inputProps: { 'aria-label': 'Character sheet' },
            },
          }}
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
        startIcon={showingSheet ? <PanelRightClose size={ICON_SIZES.sm} /> : <ScrollText size={ICON_SIZES.sm} />}
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
    height: CONTROL_HEIGHTS.xl,
    bgcolor: vttAlpha(VTT_COLORS.black, OPACITY.heavy),
    fontSize: FONT_SIZES.md,
  },
};

const buttonSx = {
  minWidth: 92,
  height: CONTROL_HEIGHTS.xl,
  ...TEXT_STYLES.title,
  fontSize: FONT_SIZES.sm,
  
};
