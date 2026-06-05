import { useState } from 'react';
import { Box, IconButton, TextField } from '@mui/material';
import { Plus, Minus } from 'lucide-react';

// Styling for the two known call sites. Add a key here to introduce a new look
// instead of leaking `sx` for the inner input/fieldset through props.
const VARIANTS = {
  default: {
    size: 'medium',
    iconSize: 18,
    inputSx: undefined,
    fieldSx: undefined,
  },
  compact: {
    size: 'small',
    iconSize: 16,
    inputSx: { fontSize: '0.75rem', py: 0.5, color: '#edd48a', fontFamily: '"Cinzel", Georgia, serif', fontWeight: 600 },
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
        sx={{ border: '1px solid', borderColor: 'divider', color: 'error.main', p: 0.4, '&:hover': { borderColor: 'error.main' } }}>
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
        sx={{ border: '1px solid', borderColor: 'divider', color: 'success.main', p: 0.4, '&:hover': { borderColor: 'success.main' } }}>
        <Plus size={iconSize} />
      </IconButton>
    </Box>
  );
}
