import { useId } from 'react';
import { Box, Button, Typography, alpha, useTheme } from '@mui/material';
import { Circle } from 'lucide-react';
import { TIER_OPTIONS } from '../boardOptions.js';
import { captionLabelSx } from '../../ui/PanelHeader.jsx';

// `clearable`: clicking the tier already picked clears it (onChange(null)).
export default function TierSelector({ value, onChange, label = 'Tier', disabled = false, clearable = false }) {
  const theme = useTheme();
  const tierColors = theme.palette.gmboard.tier;
  const labelId = useId();

  return (
    <Box>
      <Typography id={labelId} sx={labelSx}>{label}</Typography>
      <Box role="group" aria-labelledby={labelId} sx={rowSx}>
        {TIER_OPTIONS.map((option) => {
          const selected = value === option.tier;
          const tone = tierColors[option.tier];
          return (
            <Button
              key={option.tier}
              size="small"
              variant="outlined"
              aria-pressed={selected}
              disabled={disabled}
              onClick={() => onChange(clearable && selected ? null : option.tier)}
              sx={{
                fontSize: '0.72rem',
                textTransform: 'none',
                minWidth: '64px',
                borderColor: selected ? tone.color : tone.dim,
                color: selected ? tone.color : tone.dim,
                bgcolor: selected ? alpha(tone.color, 0.16) : 'transparent',
                '&:hover': { borderColor: tone.color, bgcolor: alpha(tone.color, 0.1) },
                '&:focus-visible': { outline: `2px solid ${tone.color}`, outlineOffset: '1px' },
              }}
            >
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1.2, gap: 0.25 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
                  <Circle size={9} fill={selected ? tone.color : 'transparent'} color={tone.color} />
                  <span>{option.shortLabel}</span>
                </Box>
                <Typography component="span" sx={{ fontSize: '0.6rem', opacity: 0.85 }}>{option.shortLevels}</Typography>
              </Box>
            </Button>
          );
        })}
      </Box>
    </Box>
  );
}

const labelSx = { ...captionLabelSx, mb: 0.5 };

const rowSx = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 0.75,
};
