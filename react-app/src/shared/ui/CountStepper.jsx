import { Box, IconButton } from '@mui/material';
import { Minus, Plus } from 'lucide-react';
import { UI_COLORS } from './colors.js';
import { UI_FONTS, FONT_SIZES } from './fonts.js';

// The small square button of a −/+ stepper (and its neighbours, such as an
// item's remove button): bordered, quiet, gold on hover — red when `danger`.
export function stepButtonSx(size = 20, { danger = false } = {}) {
  return {
    width: size,
    height: size,
    p: 0,
    border: 1,
    borderColor: 'divider',
    borderRadius: '3px',
    color: 'text.secondary',
    '&:hover': { borderColor: danger ? UI_COLORS.danger : UI_COLORS.gold, color: danger ? UI_COLORS.danger : UI_COLORS.gold },
    '&.Mui-disabled': { opacity: 0.4 },
  };
}

// A count with − and + beside it (an item's quantity, a party's size): every
// stepper in the app. `onStep(delta)` gets −1 or +1; `label` names what is
// counted for the buttons' names. Clicks stay inside it, so it can sit in a
// row that expands when clicked.
export default function CountStepper({
  value, onStep, size = 20, label = 'quantity', canDecrease = true, canIncrease = true, sx,
}) {
  const icon = Math.round(size * 0.6);
  return (
    <Box sx={[rowSx, sx]} onClick={(event) => event.stopPropagation()}>
      <IconButton size="small" aria-label={`Decrease ${label}`} disabled={!canDecrease} onClick={() => onStep(-1)} sx={stepButtonSx(size)}>
        <Minus size={icon} />
      </IconButton>
      <Box sx={{ ...countSx, minWidth: Math.round(size * 0.85), fontSize: size >= 20 ? FONT_SIZES.xl : FONT_SIZES.md }}>{value}</Box>
      <IconButton size="small" aria-label={`Increase ${label}`} disabled={!canIncrease} onClick={() => onStep(1)} sx={stepButtonSx(size)}>
        <Plus size={icon} />
      </IconButton>
    </Box>
  );
}

const rowSx = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
  flexShrink: 0,
};

const countSx = {
  textAlign: 'center',
  fontFamily: UI_FONTS.display,
  fontWeight: 700,
  color: UI_COLORS.goldLight,
};
