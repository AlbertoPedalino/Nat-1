import { Box, MenuItem, TextField } from '@mui/material';
import { AREA_EFFECTS } from '../../../shared/vtt/map/areas.js';

// The effect an area paints inside itself, each named with its colour dot.
// `onChange` gets the effect key, or null for a plain area.
export default function AreaEffectSelect({ value, onChange, sx = null }) {
  return (
    <TextField
      select
      label="Effect"
      size="small"
      value={value || 'none'}
      onChange={(event) => onChange(event.target.value === 'none' ? null : event.target.value)}
      sx={sx}
    >
      <MenuItem value="none">None</MenuItem>
      {AREA_EFFECTS.map((effect) => (
        <MenuItem key={effect.key} value={effect.key}>
          <Box component="span" sx={{ ...effectDotSx, bgcolor: effect.color }} />
          {effect.label}
        </MenuItem>
      ))}
    </TextField>
  );
}

const effectDotSx = {
  display: 'inline-block',
  width: 10,
  height: 10,
  mr: 1,
  borderRadius: '50%',
  flexShrink: 0,
};
