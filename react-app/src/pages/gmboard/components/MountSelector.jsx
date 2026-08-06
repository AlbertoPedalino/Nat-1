import { useId } from 'react';
import {
  Box, Button, Stack, TextField, Typography, alpha, useTheme,
} from '@mui/material';
import { Footprints, Rabbit } from 'lucide-react';
import { MAX_MOUNT_SPEED, MIN_MOUNT_SPEED, MOUNT_OPTIONS, normalizeMountSpeed } from '../logic/constants.js';

// What the party is travelling on, as a multiplier on its speed.
//
// The presets are the ones a table reaches for; the number beside them is free,
// because every setting has its own beasts and the one somebody is riding is
// never on a list of four. Shared by the board and the map's own hexcrawl
// corner, so the two cannot disagree about what ×3 means.
export default function MountSelector({
  value, onChange, label = 'Mount', dense = false, disabled = false,
}) {
  const theme = useTheme();
  const labelId = useId();
  const speed = normalizeMountSpeed(value);
  const preset = MOUNT_OPTIONS.find((option) => option.speed === speed) || null;

  return (
    <Box>
      <Typography id={labelId} sx={dense ? denseLabelSx : labelSx}>{label}</Typography>
      <Box role="group" aria-labelledby={labelId} sx={rowSx}>
        {MOUNT_OPTIONS.map((option) => {
          const selected = speed === option.speed;
          return (
            <Button
              key={option.id}
              size="small"
              variant="outlined"
              disabled={disabled}
              aria-pressed={selected}
              onClick={() => onChange(option.speed)}
              sx={{
                ...buttonSx,
                ...(dense ? denseButtonSx : null),
                borderColor: selected ? 'primary.main' : 'divider',
                color: selected ? 'primary.main' : 'text.secondary',
                bgcolor: selected ? alpha(theme.palette.primary.main, 0.16) : 'transparent',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
                {option.speed === 1 ? <Footprints size={12} /> : <Rabbit size={12} />}
                <span>×{option.speed}</span>
              </Box>
              <Typography component="span" sx={subSx}>{option.label}</Typography>
            </Button>
          );
        })}
      </Box>

      <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', mt: 0.75 }}>
        <TextField
          label="Speed ×"
          size="small"
          type="number"
          value={speed}
          disabled={disabled}
          onChange={(event) => onChange(normalizeMountSpeed(event.target.value))}
          slotProps={{ htmlInput: { min: MIN_MOUNT_SPEED, max: MAX_MOUNT_SPEED, step: 0.25 } }}
          sx={numberSx}
        />
        <Typography sx={hintSx}>
          {speed === 1
            ? (preset?.label || 'On foot') + ': a hex takes its full time.'
            : `${preset ? `${preset.label}: ` : ''}a hex takes ${fraction(speed)} of its time.`}
        </Typography>
      </Stack>
    </Box>
  );
}

// "half" reads better than "1/2" and a table says it that way; past the ones
// that have a word, the fraction is clearer than a decimal.
function fraction(speed) {
  if (speed === 2) return 'half';
  if (speed === 4) return 'a quarter';
  if (Number.isInteger(speed)) return `a ${ordinal(speed)}`;
  // ×1.5 has no word anybody says out loud, so it is a percentage.
  return `${Math.round(100 / speed)}%`;
}

function ordinal(value) {
  const words = { 3: 'third', 5: 'fifth', 6: 'sixth', 8: 'eighth', 10: 'tenth' };
  return words[value] || `${value}th`;
}

const labelSx = {
  fontFamily: '"Cinzel", Georgia, serif',
  fontSize: '0.68rem',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'text.secondary',
  mb: 0.5,
};

const denseLabelSx = {
  color: '#9f947d',
  fontSize: '0.62rem',
  letterSpacing: '0.04em',
  mb: 0.5,
};

const rowSx = { display: 'flex', flexWrap: 'wrap', gap: 0.6 };

const buttonSx = {
  display: 'flex',
  flexDirection: 'column',
  gap: 0.15,
  minWidth: '62px',
  flex: '1 1 62px',
  py: 0.4,
  px: 0.6,
  fontSize: '0.72rem',
  textTransform: 'none',
  lineHeight: 1.2,
};

const denseButtonSx = { minWidth: '54px', flex: '1 1 54px', fontSize: '0.68rem' };

const subSx = { fontSize: '0.56rem', opacity: 0.85 };

const numberSx = { width: 92, flexShrink: 0 };

const hintSx = { fontSize: '0.66rem', color: 'text.secondary', lineHeight: 1.35 };
