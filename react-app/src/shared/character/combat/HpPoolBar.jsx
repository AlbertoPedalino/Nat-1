import { Box, Typography } from '@mui/material';
import HpStepper from './HpStepper.jsx';
import { HP_TONE_COLORS, UI_COLORS } from '../../ui/colors.js';
import { FONT_SIZES } from '../../ui/fonts.js';
import { hpToneColor } from './vitals.js';
import { TEXT_STYLES } from '../../ui/textStyles.js';


// "HP cur / max [state] + stepper" pool tracker shared by creature-like sheet
// panels (Eldritch Cannon, Wild Companion familiar). Owns the HP readout styling
// and the heal/damage stepper wiring in one place; callers pass current/max, the
// persisted step `amount` (+ its setter), and an `onDelta(signed)` handler that
// clamps and saves. `stateLabel` shows next to the readout once HP hits 0.
// The readout sits on the left and the stepper on the right edge, so the bar
// fills the panel's width instead of leaving it empty on the right.
export default function HpPoolBar({
  current, max, onDelta, amount, onAmount,
  plusLabel, minusLabel, stateLabel,
}) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.6rem', flexWrap: 'wrap' }}>
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem', whiteSpace: 'nowrap', minWidth: 0 }}>
        <Typography component="span" sx={{ ...TEXT_STYLES.label, fontSize: FONT_SIZES.xxxs, color: 'text.secondary', mr: 0.4 }}>HP</Typography>
        <Typography component="span" sx={{ ...TEXT_STYLES.figure, fontSize: FONT_SIZES.title, color: hpToneColor(current, max, HP_TONE_COLORS), lineHeight: 1 }}>{current}</Typography>
        <Typography component="span" sx={{ ...TEXT_STYLES.figure, fontSize: FONT_SIZES.xxl, color: 'text.secondary' }}>/</Typography>
        <Typography component="span" sx={{ ...TEXT_STYLES.figure, fontSize: FONT_SIZES.xxl, color: 'text.secondary' }}>{max}</Typography>
        {current <= 0 && stateLabel ? <Typography component="span" sx={{ fontSize: FONT_SIZES.xs, color: UI_COLORS.dangerMuted, ml: 0.5 }}>{stateLabel}</Typography> : null}
      </Box>
      <HpStepper
        variant="sheet"
        amount={amount}
        onAmount={onAmount}
        onPlus={(n) => onDelta(n)}
        onMinus={(n) => onDelta(-n)}
        plusColor={UI_COLORS.success}
        minusColor={UI_COLORS.danger}
        plusLabel={plusLabel}
        minusLabel={minusLabel}
      />
    </Box>
  );
}
