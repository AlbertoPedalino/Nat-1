import { Box } from '@mui/material';
import SectionTitle from '../../../shared/ui/SectionTitle.jsx';
import DeathSaveDots from '../../../shared/character/combat/DeathSaveDots.jsx';

// A character piece's three success and three failure dots in its menu at 0 HP.
export default function DeathSaveControls({ deathSaves, disabled, onChange }) {
  return (
    <Box sx={deathSavePanelSx}>
      <SectionTitle>Death saves</SectionTitle>
      <DeathSaveDots
        deathSaves={deathSaves}
        disabled={disabled}
        onChange={onChange}
        colors={{ success: 'gmboard.vtt.success', fail: 'gmboard.vtt.danger' }}
      />
    </Box>
  );
}

const deathSavePanelSx = {
  display: 'flex',
  alignItems: 'center',
  gap: 0.75,
  px: 0.5,
  py: 0.5,
  border: '1px solid',
  borderColor: 'gmboard.vtt.accentTint',
  borderRadius: 1,
};
