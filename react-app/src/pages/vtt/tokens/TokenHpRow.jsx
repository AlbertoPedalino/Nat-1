import { Box, Stack, TextField, Typography } from '@mui/material';
import { VTT_COLORS } from '../../../shared/vtt/colors.js';
import HpStepper from '../../../shared/character/combat/HpStepper.jsx';
import { signed } from '../../../shared/ui/numberFormat.js';
import { STEP_TARGETS } from './useTokenMenuState.js';
import { compactFieldSx } from './tokenMenuStyles.js';
import { FONT_SIZES, FONT_WEIGHTS, LINE_HEIGHTS } from '../../../shared/ui/fonts.js';

// The piece menu's `HP / Max / Temp` row and its one "+ 5 -" stepper. `fields`
// is the menu's state (useTokenMenuState); `withVitals` is set for the GM, whose
// maximum, temporary hit points and steps are health commands. Without it only
// HP and Max are shown, written as token saves.
export default function TokenHpRow({ fields, withVitals, onClose }) {
  const {
    hpCurrent, hpMax, tempHp, maxBonus, stepTarget, setStepTarget, stepAmount, setStepAmount,
    save, flushVitals, step, changeHpCurrent, changeHpMax, changeTempHp,
  } = fields;
  const hpFieldWidth = withVitals ? 60 : 82;

  return (
    <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
      <TextField
        label="HP"
        size="small"
        type="number"
        value={hpCurrent}
        onChange={(event) => changeHpCurrent(event.target.value)}
        onFocus={() => setStepTarget('hp')}
        onBlur={() => save({})}
        onKeyDown={(event) => {
          event.stopPropagation();
          if (event.key === 'Enter') { save({}); onClose(); }
        }}
        sx={{ ...compactFieldSx, ...stepTargetSx(withVitals && stepTarget === 'hp'), width: hpFieldWidth }}
      />
      <Typography sx={slashSx}>/</Typography>
      <Box sx={maxSlotSx}>
        <TextField
          label="Max"
          size="small"
          type="number"
          value={hpMax}
          onChange={(event) => changeHpMax(event.target.value)}
          onFocus={() => setStepTarget('max')}
          onBlur={() => (withVitals ? flushVitals() : save({}))}
          onKeyDown={(event) => {
            event.stopPropagation();
            if (event.key === 'Enter') { flushVitals(); save({}); onClose(); }
          }}
          sx={{ ...compactFieldSx, ...stepTargetSx(withVitals && stepTarget === 'max'), width: hpFieldWidth }}
        />
        {/* A maximum above or below the base one (Aid, a curse) says
            by how much, on the field's corner. */}
        {maxBonus ? (
          <Box
            component="span"
            title={`Maximum ${maxBonus > 0 ? 'raised' : 'lowered'} by ${Math.abs(maxBonus)}`}
            sx={{ ...maxBonusSx, color: maxBonus > 0 ? 'success.main' : 'error.main' }}
          >
            {signed(maxBonus)}
          </Box>
        ) : null}
      </Box>
      {withVitals ? (
        <>
        <TextField
          label="Temp"
          size="small"
          type="number"
          value={tempHp}
          onChange={(event) => changeTempHp(event.target.value)}
          onFocus={() => setStepTarget('temp')}
          onBlur={flushVitals}
          onKeyDown={(event) => {
            event.stopPropagation();
            if (event.key === 'Enter') { flushVitals(); onClose(); }
          }}
          sx={{ ...compactFieldSx, ...tempFieldSx, ...stepTargetSx(stepTarget === 'temp'), width: hpFieldWidth }}
        />
        <Box sx={stepperSlotSx} onKeyDown={(event) => event.stopPropagation()}>
          <HpStepper
            amount={stepAmount}
            onAmount={setStepAmount}
            onPlus={(n) => step(n)}
            onMinus={(n) => step(-n)}
            plusColor="success.main"
            minusColor="error.main"
            plusLabel={STEP_TARGETS[stepTarget].plusLabel}
            minusLabel={STEP_TARGETS[stepTarget].minusLabel}
          />
        </Box>
        </>
      ) : null}
    </Stack>
  );
}

const slashSx = { color: 'text.secondary', fontSize: FONT_SIZES.sm };
const tempFieldSx = { '& .MuiInputBase-input': { color: VTT_COLORS.tempHpText } };
const stepperSlotSx = { ml: 'auto !important', display: 'flex' };
const maxSlotSx = { position: 'relative', display: 'flex' };
// On the field's top-right corner, over its outline, as the label sits on
// the top-left one.
const maxBonusSx = {
  position: 'absolute',
  top: -7,
  right: 4,
  px: 0.25,
  bgcolor: 'gmboard.vtt.surfaceSolid',
  fontSize: FONT_SIZES.xxs,
  fontWeight: FONT_WEIGHTS.bold,
  lineHeight: LINE_HEIGHTS.tight,
  pointerEvents: 'none',
};
// The field the stepper acts on keeps a gold outline after the cursor leaves.
const stepTargetSx = (active) => (active
  ? { '& .MuiOutlinedInput-notchedOutline': { borderColor: 'primary.main' } }
  : {});
