import { Box, Typography } from '@mui/material';
import { ReminderEditor } from '../../../shared/character/combat/ReminderChips.jsx';
import { ConditionToggleGrid } from '../../../shared/character/combat/ConditionChips.jsx';
import { sectionTitleSx } from './tokenMenuStyles.js';
import { FONT_SIZES } from '../../../shared/ui/fonts.js';

// The piece menu's side-by-side Conditions and Reminders columns.
export default function TokenMarkers({
  conditions, effects, canMark, canSetEffects, onConditionClick, onAddReminder, onRemoveReminder,
}) {
  return (
    <Box sx={markerGridSx}>
      <Box sx={markerSectionSx}>
        <Typography sx={sectionTitleSx}>Conditions</Typography>
        <ConditionToggleGrid
          active={conditions}
          onToggle={onConditionClick}
          disabled={!canMark}
          sx={chipsSx}
          chipSx={compactChipSx}
        />
      </Box>

      {/* Reminders ("Bardic Inspiration", "Guidance"): written by name above
          the piece for the whole table, as on the sheet. */}
      <Box sx={{ ...markerSectionSx, ...reminderSectionSx }}>
        <Typography sx={sectionTitleSx}>Reminders</Typography>
        <ReminderEditor
          effects={effects}
          disabled={!canSetEffects}
          onAdd={onAddReminder}
          onRemove={onRemoveReminder}
        />
      </Box>
    </Box>
  );
}

const markerGridSx = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.08fr)',
  border: '1px solid',
  borderColor: 'gmboard.vtt.accentTint',
  borderRadius: 1,
  overflow: 'hidden',
};

const markerSectionSx = {
  minWidth: 0,
  p: 0.6,
  display: 'flex',
  flexDirection: 'column',
  gap: 0.35,
};

const reminderSectionSx = {
  borderLeft: '1px solid',
  borderLeftColor: 'gmboard.vtt.accentTint',
};

const chipsSx = {
  display: 'flex',
  flexWrap: 'wrap',
  alignContent: 'flex-start',
  gap: 0.3,
  maxHeight: 150,
  overflowY: 'auto',
};

const compactChipSx = {
  height: 20,
  '& .MuiChip-label': { px: 0.55, fontSize: FONT_SIZES.xxs, lineHeight: 1 },
};
