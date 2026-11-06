import { Box, Typography } from '@mui/material';
import { sectionTitleSx } from './tokenMenuStyles.js';
import DeathSaveDots from '../../../shared/character/combat/DeathSaveDots.jsx';

// A character piece's three success and three failure dots in its menu at 0 HP.
export default function DeathSaveControls({ deathSaves, disabled, onChange }) {
  return (
    <Box sx={deathSavePanelSx}>
      <Typography sx={sectionTitleSx}>Death saves</Typography>
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
  gap: 0.8,
  px: 0.6,
  py: 0.4,
  border: '1px solid',
  borderColor: 'gmboard.vtt.goldTint',
  borderRadius: 1,
};
