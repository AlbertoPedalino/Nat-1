import { useState } from 'react';
import { ICON_SIZES } from '../../ui/iconSizes.js';
import { Box, IconButton, TextField } from '@mui/material';
import { Plus, Minus } from 'lucide-react';
import { UI_COLORS } from '../../ui/colors.js';
import { FONT_SIZES } from '../../ui/fonts.js';
import { TEXT_STYLES } from '../../ui/textStyles.js';
import { stepButtonSx } from '../../ui/pressable.js';

// Styling for the two known call sites. Add a key here to introduce a new look
// instead of leaking `sx` for the inner input/fieldset through props.
const VARIANTS = {
  default: {
    size: 'medium',
    iconSize: ICON_SIZES.lg,
    inputSx: undefined,
    fieldSx: undefined,
  },
  compact: {
    size: 'small',
    iconSize: ICON_SIZES.md,
    inputSx: { fontSize: FONT_SIZES.lg, py: 0.5, color: UI_COLORS.accentText, ...TEXT_STYLES.figure },
    fieldSx: { '& fieldset': { borderColor: 'transparent', borderBottom: '1px solid', borderBottomColor: 'primary.main' } },
  },
};

/**
 * XP editor that adds/subtracts a delta from the current total instead of
 * overwriting it. Renders [−][amount][+]; the total stays clamped at 0.
 *
 * @param {number}   currentXp  current total XP
 * @param {function} onApply    called with the new total (number)
 * @param {'default'|'compact'} [variant]  visual preset
 * @param {object}   [sx]       outer Box overrides (width, gap, …)
 */
// The − and + beside the field, by the field's size.
const STEP_SIZE = { small: 26, medium: 32 };

export default function XpDeltaControl({ currentXp, onApply, variant = 'default', sx }) {
  const [delta, setDelta] = useState('');
  const { size, iconSize, inputSx, fieldSx } = VARIANTS[variant] ?? VARIANTS.default;

  const apply = (sign) => {
    const n = parseInt(delta, 10);
    if (!n || n <= 0) return;
    onApply(Math.max(0, currentXp + sign * n));
    setDelta('');
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ...sx }}>
      <IconButton size={size} onClick={() => apply(-1)} aria-label="Subtract XP"
        sx={stepButtonSx(STEP_SIZE[size] ?? STEP_SIZE.small, { tone: UI_COLORS.danger })}>
        <Minus size={iconSize} />
      </IconButton>
      <TextField
        size={size}
        type="text"
        value={delta}
        placeholder="± XP"
        onFocus={(event) => event.currentTarget.select()}
        onChange={(event) => setDelta(event.target.value.replace(/\D/g, '').replace(/^0+(?=\d)/, ''))}
        onKeyDown={(event) => { if (event.key === 'Enter') apply(1); }}
        sx={{ flex: 1, '& input': { textAlign: 'center', ...inputSx } }}
        slotProps={{ input: { inputMode: 'numeric', sx: fieldSx } }}
      />
      <IconButton size={size} onClick={() => apply(1)} aria-label="Add XP"
        sx={stepButtonSx(STEP_SIZE[size] ?? STEP_SIZE.small, { tone: UI_COLORS.success })}>
        <Plus size={iconSize} />
      </IconButton>
    </Box>
  );
}
