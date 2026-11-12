import { Box } from '@mui/material';
import { AREA_EFFECTS } from '../../../shared/vtt/map/areas.js';
import SelectField from '../../../shared/ui/SelectField.jsx';

// The effect an area paints inside itself, each named with its colour dot.
// `onChange` gets the effect key, or null for a plain area.
export default function AreaEffectSelect({ value, onChange, sx = null }) {
  return (
    <SelectField
      label="Effect"
      value={value || 'none'}
      onChange={(next) => onChange(next === 'none' ? null : next)}
      emptyOption={{ label: 'None' }}
      emptyValue="none"
      options={AREA_EFFECTS.map((effect) => ({
        value: effect.key,
        label: (
          <>
            <Box component="span" sx={{ ...effectDotSx, bgcolor: effect.color }} />
            {effect.label}
          </>
        ),
      }))}
      fullWidth={false}
      sx={sx}
    />
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
