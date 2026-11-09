import { Box, TextField } from '@mui/material';
import { UI_COLORS } from './colors.js';
import { FONT_SIZES } from './fonts.js';

// A range typed by hand: "min – max unit" (the item filters' weight and value,
// the compendium equipment's cost and weight). The values are the fields'
// text, '' for an open end; withinTypedRange (numbers.js) reads them.
export default function RangeInputs({
  label, unit, step = 1, min, max, onMin, onMax,
}) {
  return (
    <>
      <TextField
        size="small"
        type="number"
        placeholder="min"
        value={min ?? ''}
        onChange={(event) => onMin(event.target.value)}
        slotProps={{ htmlInput: { min: 0, step, 'aria-label': `${label} minimum` } }}
        sx={numberFieldSx}
      />
      <Box component="span" sx={unitSx}>–</Box>
      <TextField
        size="small"
        type="number"
        placeholder="max"
        value={max ?? ''}
        onChange={(event) => onMax(event.target.value)}
        slotProps={{ htmlInput: { min: 0, step, 'aria-label': `${label} maximum` } }}
        sx={numberFieldSx}
      />
      {unit ? <Box component="span" sx={unitSx}>{unit}</Box> : null}
    </>
  );
}

const numberFieldSx = {
  width: 72,
  '& .MuiOutlinedInput-root': { bgcolor: UI_COLORS.headerBg, borderRadius: 1 },
  '& input': { fontSize: FONT_SIZES.md, py: '6px' },
};

const unitSx = { fontSize: FONT_SIZES.xs, color: 'text.secondary' };
