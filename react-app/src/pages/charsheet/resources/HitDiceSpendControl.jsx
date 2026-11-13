import { Box, Typography } from '@mui/material';
import GemPip from '../../../shared/ui/GemPip.jsx';
import { withModifier } from '../../../shared/ui/numberFormat.js';
import { FONT_SIZES } from '../../../shared/ui/fonts.js';
import { clamp } from '../../../shared/numbers.js';
import { TEXT_STYLES } from '../../../shared/ui/textStyles.js';
import { SURFACES } from '../../../shared/ui/surfaces.js';

// The Hit Dice of the Short Rest dialog, as gems (GemPip): lit gems are dice
// left, empty settings dice already used, ringed gems the dice chosen to
// spend on this rest. Click a gem to set how many to spend (click the last
// chosen one again to take it back).
export default function HitDiceSpendControl({ pool, value, onChange, conMod }) {
  const setCount = (n) => onChange(clamp(n, 0, pool.remaining));

  return (
    <Box sx={{ ...SURFACES.panel, p: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
        <Typography sx={{ ...TEXT_STYLES.figure, fontSize: FONT_SIZES.md, color: 'primary.main', flex: 1 }}>
          {pool.label} d{pool.faces}
        </Typography>
        <Typography sx={{ fontSize: FONT_SIZES.sm, color: 'text.secondary' }}>
          {pool.remaining}/{pool.total} left
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
        {Array.from({ length: pool.total }, (_, i) => {
          const used = i >= pool.remaining;
          const spending = !used && i < value;
          return (
            <GemPip
              key={i}
              kind="hitDice"
              available={!used}
              selected={spending}
              onClick={used ? undefined : () => setCount(value === i + 1 ? i : i + 1)}
              aria-label={`${pool.label}: spend ${i + 1} of ${pool.remaining}`}
              title={used ? 'Already used' : spending ? 'Will spend' : 'Available'}
            />
          );
        })}
      </Box>
      <Typography sx={{ fontSize: FONT_SIZES.sm, color: 'text.secondary', textAlign: 'right', mt: 0.5 }}>
        Spend: {withModifier(`${value}d${pool.faces}`, conMod)} each
      </Typography>
    </Box>
  );
}
