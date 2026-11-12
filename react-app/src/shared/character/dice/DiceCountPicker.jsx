import { Box, Typography } from '@mui/material';
import CountStepper from '../../ui/CountStepper.jsx';
import { FONT_SIZES } from '../../ui/fonts.js';
import { TEXT_STYLES } from '../../ui/textStyles.js';
import { LIST_ROW_RULE_SX } from '../../ui/interactive.js';

// How many of each die to throw: one row per die type, its name and a
// CountStepper. The custom roll and the fumble tables both pick dice this way.
// - `dice`: the faces offered, in order (2, 4, 6, …); `counts`: {faces: count}.
// - `onStep(faces, delta)`: the caller applies (and clamps) the change.
// - `canDecrease(faces, count)` / `canIncrease(faces, count)`: the limits.
// - `sx`: where the rows go (a single column by default, a grid of columns in
//   a wide dialog).

// A two-sided die is a coin, and calling it one is clearer than "d2" — it is
// also what gets thrown on the battle map. The formula a caller builds is
// still `Nd2`, which is what every roller in the app understands.
const DIE_LABELS = { 2: 'Coin' };
const dieLabel = (faces) => DIE_LABELS[faces] || `d${faces}`;

export default function DiceCountPicker({
  dice, counts, onStep, canDecrease = () => true, canIncrease = () => true, sx,
}) {
  return (
    <Box sx={sx}>
      {dice.map((faces) => {
        const count = Number(counts?.[faces]) || 0;
        return (
          <Box key={faces} sx={rowSx}>
            <Typography sx={labelSx}>{dieLabel(faces)}</Typography>
            <CountStepper
              value={count}
              size={24}
              label={dieLabel(faces)}
              canDecrease={canDecrease(faces, count)}
              canIncrease={canIncrease(faces, count)}
              onStep={(delta) => onStep(faces, delta)}
            />
          </Box>
        );
      })}
    </Box>
  );
}

const rowSx = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 0.5, py: 0.5, ...LIST_ROW_RULE_SX };
const labelSx = { ...TEXT_STYLES.figure, fontSize: FONT_SIZES.xl, color: 'text.primary', minWidth: 42 };
