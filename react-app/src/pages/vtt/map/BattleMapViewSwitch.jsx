import { Button, Stack } from '@mui/material';
import { PanelRightClose, ScrollText } from 'lucide-react';
import { FONT_SIZES } from '../../../shared/ui/fonts.js';
import { TEXT_STYLES } from '../../../shared/ui/textStyles.js';
import { ICON_SIZES } from '../../../shared/ui/iconSizes.js';
import { CONTROL_HEIGHTS } from '../../../shared/ui/controlHeights.js';
import SelectField from '../../../shared/ui/SelectField.jsx';

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
        <SelectField
          ariaLabel="Character sheet"
          value={picked ? selectedId : ''}
          onChange={onSelectionChange}
          placeholder="Character…"
          options={choices.map((entry) => ({ value: entry.characterId, label: entry.name }))}
          fullWidth={false}
          onMap
          sx={selectSx}
        />
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

const selectSx = { width: { xs: 148, sm: 210 } };

const buttonSx = {
  minWidth: 92,
  height: CONTROL_HEIGHTS.xl,
  ...TEXT_STYLES.title,
  fontSize: FONT_SIZES.sm,
  
};
