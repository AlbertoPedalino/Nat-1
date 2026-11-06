import { Box, Typography } from '@mui/material';
import HpStepper from './HpStepper.jsx';
import { UI_COLORS } from '../../ui/colors.js';
import { UI_FONTS } from '../../ui/fonts.js';
import { hpTone } from './vitals.js';

const CINZEL = UI_FONTS.display;

const HP_TONE_COLORS = { healthy: UI_COLORS.success, wounded: UI_COLORS.warning, critical: UI_COLORS.dangerHp };

function hpColor(current, max) {
  return HP_TONE_COLORS[hpTone(current, max)];
}

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
        <Typography component="span" sx={{ fontFamily: CINZEL, fontSize: '0.5rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'text.secondary', mr: 0.4 }}>HP</Typography>
        <Typography component="span" sx={{ fontFamily: CINZEL, fontSize: '1.25rem', fontWeight: 700, color: hpColor(current, max), lineHeight: 1 }}>{current}</Typography>
        <Typography component="span" sx={{ fontFamily: CINZEL, fontSize: '0.85rem', color: 'text.secondary' }}>/</Typography>
        <Typography component="span" sx={{ fontFamily: CINZEL, fontSize: '0.85rem', fontWeight: 600, color: 'text.secondary' }}>{max}</Typography>
        {current <= 0 && stateLabel ? <Typography component="span" sx={{ fontSize: '0.62rem', color: UI_COLORS.dangerMuted, ml: 0.5 }}>{stateLabel}</Typography> : null}
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
