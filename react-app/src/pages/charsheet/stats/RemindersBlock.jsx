import { Box, Typography } from '@mui/material';
import { ReminderEditor } from '../../../shared/character/combat/ReminderChips.jsx';
import { sheetBoxSx, sheetBoxTitleSx } from '../../../shared/ui/PanelHeader.jsx';
import { FONT_SIZES } from '../../../shared/ui/fonts.js';

// What the character has going right now — Bardic Inspiration, Guidance, Bless —
// by name, always in view, framed like Conditions above it. The same list
// rides above the character's piece on the battle map and on its encounter
// combatant. A reminder changes no roll and stays until someone removes it.
export default function RemindersBlock({ sheet, actions }) {
  return (
    <Box sx={{ ...sheetBoxSx, flex: 1, minWidth: 140, p: '0.4rem 0.62rem', mt: '0.4rem' }}>
      <Typography sx={sheetBoxTitleSx}>
        Reminders
      </Typography>
      <ReminderEditor
        effects={sheet.activeEffects}
        disabled={Boolean(actions.readOnly)}
        fontSize={FONT_SIZES.xxs}
        onAdd={actions.add}
        onRemove={actions.remove}
      />
    </Box>
  );
}
