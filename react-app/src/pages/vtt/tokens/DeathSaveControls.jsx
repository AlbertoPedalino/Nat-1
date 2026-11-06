import { Box, Typography } from '@mui/material';
import { sectionTitleSx } from './tokenMenuStyles.js';

// A character piece's three success and three failure dots in its menu at 0 HP.
export default function DeathSaveControls({ deathSaves, disabled, onChange }) {
  return (
    <Box sx={deathSavePanelSx}>
      <Typography sx={sectionTitleSx}>Death saves</Typography>
      <Box sx={deathSaveRowsSx}>
        {[['success', 'Success', 'gmboard.vtt.success'], ['fail', 'Failure', 'gmboard.vtt.danger']].map(([type, label, color]) => (
          <Box key={type} sx={deathSaveRowSx}>
            <Typography sx={deathSaveLabelSx}>{label}</Typography>
            {[1, 2, 3].map((value) => (
              <Box
                key={value}
                component="button"
                type="button"
                aria-label={`${label} ${value}`}
                disabled={disabled}
                data-active={deathSaves[type] >= value ? 'true' : 'false'}
                onClick={() => onChange(type, value)}
                sx={{
                  ...deathSaveDotSx,
                  borderColor: color,
                  bgcolor: deathSaves[type] >= value ? color : 'transparent',
                }}
              />
            ))}
          </Box>
        ))}
      </Box>
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
const deathSaveRowsSx = { display: 'flex', gap: 1 };
const deathSaveRowSx = { display: 'flex', alignItems: 'center', gap: 0.3 };
const deathSaveLabelSx = { fontSize: '0.55rem', color: 'text.secondary', mr: 0.1 };
const deathSaveDotSx = {
  width: 13,
  height: 13,
  p: 0,
  border: '1px solid',
  borderRadius: '50%',
  cursor: 'pointer',
  '&:disabled': { cursor: 'default', opacity: 0.45 },
};
