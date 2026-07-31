import { Box, IconButton, TextField } from '@mui/material';
import { Plus, Minus } from 'lucide-react';

// Visual presets for the call sites (sheet HP block vs encounter combatant card).
// Add a key here for a new look instead of leaking inner `sx` through props —
// same VARIANTS convention as XpDeltaControl.
const VARIANTS = {
  sheet: {
    btnSize: 22,
    iconSize: 12,
    amountWidth: 46,
    gap: 0.3,
    amountInputSx: { py: 0.25, fontSize: '0.72rem', fontFamily: '"Cinzel", Georgia, serif', fontWeight: 600 },
  },
  combat: {
    btnSize: 26,
    iconSize: 14,
    amountWidth: 52,
    gap: 0.4,
    amountInputSx: undefined, // input font is inherited from the card's HP row
  },
};

// Clamp a raw amount field to a positive integer (minimum 1).
export const stepAmount = (value) => Math.max(1, parseInt(value, 10) || 1);

/**
 * "+ [amount] −" stepper whose step amount PERSISTS between clicks, so you can
 * repeat-apply the same delta (heal 5, heal 5, …). Clamping the resulting value
 * is the caller's job (the reducer / handler that receives onPlus/onMinus).
 *
 * @param {string|number} amount        current step amount (controlled)
 * @param {function}      onAmount      called with the raw amount string
 * @param {function}      onPlus        called with the clamped step (>=1)
 * @param {function}      onMinus       called with the clamped step (>=1)
 * @param {string}        [plusColor]   + button color (defaults to neutral)
 * @param {string}        [minusColor]  − button color (defaults to neutral)
 * @param {string}        plusLabel     aria-label for the + button
 * @param {string}        minusLabel    aria-label for the − button
 * @param {'sheet'|'combat'} [variant]  visual preset
 */
export default function HpStepper({
  amount,
  onAmount,
  onPlus,
  onMinus,
  plusColor,
  minusColor,
  plusLabel,
  minusLabel,
  variant = 'combat',
}) {
  const { btnSize, iconSize, amountWidth, gap, amountInputSx } = VARIANTS[variant] ?? VARIANTS.combat;
  const amt = stepAmount(amount);
  const btnSx = (color) => ({
    width: btnSize,
    height: btnSize,
    border: 1,
    borderColor: color || 'divider',
    color: color || 'text.secondary',
    borderRadius: 1,
    flex: '0 0 auto',
  });

  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap, flex: '0 0 auto' }}>
      <IconButton size="small" onClick={() => onPlus(amt)} aria-label={plusLabel} sx={btnSx(plusColor)}>
        <Plus size={iconSize} />
      </IconButton>
      <TextField
        size="small"
        value={amount}
        onChange={(event) => {
          const v = event.target.value;
          if (v === '' || /^\d*$/.test(v)) onAmount(v);
        }}
        onFocus={(event) => event.target.select()}
        slotProps={{ htmlInput: { inputMode: 'numeric', 'aria-label': 'Step amount', style: { textAlign: 'center' } } }}
        sx={{ width: amountWidth, flex: '0 0 auto', '& input': amountInputSx }}
      />
      <IconButton size="small" onClick={() => onMinus(amt)} aria-label={minusLabel} sx={btnSx(minusColor)}>
        <Minus size={iconSize} />
      </IconButton>
    </Box>
  );
}
