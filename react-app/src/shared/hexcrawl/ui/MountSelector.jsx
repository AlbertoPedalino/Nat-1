import { Box, TextField, Typography } from '@mui/material';
import { Footprints, Rabbit } from 'lucide-react';
import { MAX_MOUNT_SPEED, MIN_MOUNT_SPEED, MOUNT_OPTIONS, normalizeMountSpeed } from '../../gmboard/boardOptions.js';
import SelectorGroup from '../../gmboard/ui/SelectorGroup.jsx';

// What the party is travelling on, as a multiplier on its speed.
//
// The presets are the ones a table reaches for; the number beside them is free,
// because every setting has its own beasts and the one somebody is riding is
// never on a list of four. Shared by the board and the map's own hexcrawl
// corner, so the two cannot disagree about what ×3 means.
export default function MountSelector({
  value, onChange, label = 'Mount', dense = false, disabled = false,
}) {
  const speed = normalizeMountSpeed(value);
  const preset = MOUNT_OPTIONS.find((option) => option.speed === speed) || null;
  const effect = speed === 1
    ? `${preset?.label || 'On foot'}: a hex takes its full time.`
    : `${preset ? `${preset.label}: ` : ''}a hex takes ${fraction(speed)} of its time.`;

  return (
    <Box>
      <Box sx={rowSx}>
        <SelectorGroup
          label={label}
          options={MOUNT_OPTIONS}
          getLabel={(option) => `×${option.speed}`}
          getSub={(option) => option.label}
          getIcon={(option) => (option.speed === 1 ? Footprints : Rabbit)}
          value={preset?.id ?? null}
          onChange={(option) => onChange(option.speed)}
          dense={dense}
          disabled={disabled}
        />
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
      </Box>
      <Typography sx={hintSx}>{effect}</Typography>
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

// The free number sits at the end of the presets' row, level with them.
const rowSx = {
  display: 'flex',
  alignItems: 'flex-end',
  flexWrap: 'wrap',
  gap: 0.75,
};

const numberSx = { width: 92, flexShrink: 0 };

const hintSx = { fontSize: '0.66rem', color: 'text.secondary', lineHeight: 1.35, mt: 0.75 };
