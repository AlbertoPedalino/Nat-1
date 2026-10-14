import { Box, Typography } from '@mui/material';
import { ReminderEditor } from '../../../shared/character/combat/ReminderChips.jsx';

// What the character has going right now — Bardic Inspiration, Guidance, Bless —
// by name, always in view, framed like Conditions above it. The same list
// rides above the character's piece on the battle map and on its encounter
// combatant. A reminder changes no roll and stays until someone removes it.
export default function RemindersBlock({ sheet, actions }) {
  return (
    <Box sx={{ flex: 1, minWidth: 140, bgcolor: 'rgba(35,32,26,1)', border: 1, borderColor: 'divider', borderRadius: 1, p: '0.4rem 0.62rem', mt: '0.4rem' }}>
      <Typography sx={{ fontFamily: '"Cinzel", Georgia, serif', fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'primary.main', mb: 0.4 }}>
        Reminders
      </Typography>
      <ReminderEditor
        effects={sheet.activeEffects}
        disabled={Boolean(actions.readOnly)}
        fontSize="0.56rem"
        onAdd={actions.add}
        onRemove={actions.remove}
      />
    </Box>
  );
}
