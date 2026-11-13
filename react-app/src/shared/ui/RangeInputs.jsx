import { Box } from '@mui/material';
import NumberField from './NumberField.jsx';
import { FONT_SIZES } from './fonts.js';

// A range typed by hand: "min – max unit" (the item filters' weight and value,
// the compendium equipment's cost and weight). The values are the fields'
// text, '' for an open end; withinTypedRange (numbers.js) reads them.
export default function RangeInputs({
  label, unit, min, max, onMin, onMax,
}) {
  return (
    <>
      <NumberField placeholder="min" value={min} onChange={onMin} ariaLabel={`${label} minimum`} sx={numberFieldSx} />
      <Box component="span" sx={unitSx}>–</Box>
      <NumberField placeholder="max" value={max} onChange={onMax} ariaLabel={`${label} maximum`} sx={numberFieldSx} />
      {unit ? <Box component="span" sx={unitSx}>{unit}</Box> : null}
    </>
  );
}

const numberFieldSx = {
  width: 72,
  '& input': { fontSize: FONT_SIZES.md, py: 0.75 },
};

const unitSx = { fontSize: FONT_SIZES.xs, color: 'text.secondary' };
