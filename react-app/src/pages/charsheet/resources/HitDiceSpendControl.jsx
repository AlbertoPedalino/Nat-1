import { Box, Typography } from '@mui/material';
import PipButton from '../../../shared/ui/PipButton.jsx';
import { withModifier } from '../../../shared/ui/numberFormat.js';
import { UI_COLORS, uiAlpha, OPACITY } from '../../../shared/ui/colors.js';
import { FONT_SIZES } from '../../../shared/ui/fonts.js';
import { clamp } from '../../../shared/numbers.js';
import { TEXT_STYLES } from '../../../shared/ui/textStyles.js';
import { SURFACES } from '../../../shared/ui/surfaces.js';

// Interactive Hit Dice pips for the Short Rest dialog. Mirrors the look of
// the old standalone Hit Dice panel: hollow pips are dice already used,
// filled pips are available, highlighted pips are queued to spend on this
// rest. Click a pip to set how many dice to spend (click the last queued
// pip again to decrement).
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
            <PipButton
              key={i}
              onClick={used ? undefined : () => setCount(value === i + 1 ? i : i + 1)}
              aria-label={`${pool.label}: spend ${i + 1} of ${pool.remaining}`}
              title={used ? 'Already used' : spending ? 'Will spend' : 'Available'}
              sx={{
                fontSize: FONT_SIZES.sm,
                borderColor: spending ? UI_COLORS.accent : used ? 'divider' : uiAlpha(UI_COLORS.accent, OPACITY.strong),
                color: spending ? UI_COLORS.surfaceDeep : used ? 'text.disabled' : 'primary.main',
                bgcolor: spending ? UI_COLORS.accent : used ? UI_COLORS.surfaceHeader : uiAlpha(UI_COLORS.accent, OPACITY.fill),
                opacity: used ? OPACITY.line : 1,
              }}
            >
              {used ? '○' : '●'}
            </PipButton>
          );
        })}
      </Box>
      <Typography sx={{ fontSize: FONT_SIZES.sm, color: 'text.secondary', textAlign: 'right', mt: 0.5 }}>
        Spend: {withModifier(`${value}d${pool.faces}`, conMod)} each
      </Typography>
    </Box>
  );
}
