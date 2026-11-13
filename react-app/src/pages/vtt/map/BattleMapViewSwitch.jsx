import { Button, Stack } from '@mui/material';
import { PanelRightClose, ScrollText } from 'lucide-react';
import { FONT_SIZES } from '../../../shared/ui/fonts.js';
import { ICON_SIZES } from '../../../shared/ui/iconSizes.js';
import { CONTROL_HEIGHTS } from '../../../shared/ui/controlHeights.js';
import SheetCharacterSelect from '../sheets/SheetCharacterSelect.jsx';

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

  return (
    <Stack direction="row" spacing={0.75} sx={rootSx}>
      {showingSheet ? (
        <SheetCharacterSelect choices={choices} selectedId={selectedId} onChange={onSelectionChange} />
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

const buttonSx = {
  minWidth: 92,
  height: CONTROL_HEIGHTS.xl,
  fontSize: FONT_SIZES.sm,
  
};
