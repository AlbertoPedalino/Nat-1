import { Button, Stack } from '@mui/material';
import { PanelRightClose } from 'lucide-react';
import { ICON_SIZES } from '../../../shared/ui/iconSizes.js';
import SheetCharacterSelect from '../sheets/SheetCharacterSelect.jsx';
import { GAME_ICONS } from '../../../shared/ui/gameIcons.js';
import { MAP_SHEET_TOGGLE_SX } from './sceneViewportStyles.js';

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
        startIcon={showingSheet ? <PanelRightClose size={ICON_SIZES.sm} /> : <GAME_ICONS.characterSheet size={ICON_SIZES.sm} />}
        disabled={!hasSheets}
        title={hasSheets ? undefined : 'No character sheet is available to you.'}
        aria-label={showingSheet ? 'Hide character sheet' : 'Show character sheet'}
        onClick={() => onViewChange(showingSheet ? 'map' : 'sheet')}
        sx={MAP_SHEET_TOGGLE_SX}
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


