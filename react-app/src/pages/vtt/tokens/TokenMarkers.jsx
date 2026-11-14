import { Box } from '@mui/material';
import { ReminderEditor } from '../../../shared/character/combat/ReminderChips.jsx';
import { ConditionToggleGrid } from '../../../shared/character/combat/ConditionChips.jsx';
import SectionTitle from '../../../shared/ui/SectionTitle.jsx';

// The piece menu's side-by-side Conditions and Reminders columns.
export default function TokenMarkers({
  conditions, effects, canMark, canSetEffects, onConditionClick, onAddReminder, onRemoveReminder,
}) {
  return (
    <Box sx={markerGridSx}>
      <Box sx={markerSectionSx}>
        <SectionTitle>Conditions</SectionTitle>
        <ConditionToggleGrid
          active={conditions}
          onToggle={onConditionClick}
          disabled={!canMark}
          sx={chipsSx}
          density="menu"
        />
      </Box>

      {/* Reminders ("Bardic Inspiration", "Guidance"): written by name above
          the piece for the whole table, as on the sheet. */}
      <Box sx={{ ...markerSectionSx, ...reminderSectionSx }}>
        <SectionTitle>Reminders</SectionTitle>
        <ReminderEditor
          effects={effects}
          disabled={!canSetEffects}
          density="menu"
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
  p: 0.5,
  display: 'flex',
  flexDirection: 'column',
  gap: 0.25,
};

const reminderSectionSx = {
  borderLeft: '1px solid',
  borderLeftColor: 'gmboard.vtt.accentTint',
};

const chipsSx = {
  display: 'flex',
  flexWrap: 'wrap',
  alignContent: 'flex-start',
  gap: 0.25,
  maxHeight: 150,
  overflowY: 'auto',
};
