import { Box, IconButton } from '@mui/material';
import { Minus, Plus } from 'lucide-react';
import { UI_COLORS } from './colors.js';
import { FONT_SIZES } from './fonts.js';
import { TEXT_STYLES } from './textStyles.js';
import { stepButtonSx } from './pressable.js';

// A count with − and + beside it (an item's quantity, a party's size): every
// stepper in the app. `onStep(delta)` gets −1 or +1; `label` names what is
// counted for the buttons' names ("Decrease <label>", "Increase <label>").
// Clicks stay inside it, so it can sit in a row that expands when clicked.
// - `value`: what sits between the buttons — a number, a formatted string
//   ("+2", "3/5") or any node (a field to type an amount in, a bar).
// - `tone`: tints the buttons and the count (a condition's colour, the
//   attunement purple); the accent text colour by default.
// - `fullWidth`: spans its container, the value taking the room between the
//   buttons (a field or a bar rather than a short figure).
export default function CountStepper({
  value, onStep, size = 20, label = 'quantity', canDecrease = true, canIncrease = true,
  tone = null, fullWidth = false, sx,
}) {
  const icon = Math.round(size * 0.6);
  const buttonSx = stepButtonSx(size, { tone });
  return (
    <Box sx={[rowSx, fullWidth && fullRowSx, sx]} onClick={(event) => event.stopPropagation()}>
      <IconButton size="small" aria-label={`Decrease ${label}`} disabled={!canDecrease} onClick={() => onStep(-1)} sx={buttonSx}>
        <Minus size={icon} />
      </IconButton>
      <Box
        sx={[
          countSx,
          { minWidth: Math.round(size * 0.85), fontSize: size >= 20 ? FONT_SIZES.xl : FONT_SIZES.md, color: tone || UI_COLORS.accentText },
          fullWidth && fullCountSx,
        ]}
      >
        {value}
      </Box>
      <IconButton size="small" aria-label={`Increase ${label}`} disabled={!canIncrease} onClick={() => onStep(1)} sx={buttonSx}>
        <Plus size={icon} />
      </IconButton>
    </Box>
  );
}

const rowSx = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 0.5,
  flexShrink: 0,
};

const fullRowSx = {
  display: 'flex',
  width: '100%',
  flexShrink: 1,
  minWidth: 0,
};

const countSx = {
  textAlign: 'center',
  ...TEXT_STYLES.figure,
};

const fullCountSx = {
  flex: 1,
  minWidth: 0,
};
