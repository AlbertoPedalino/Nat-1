import { useState } from 'react';
import { Box, Button, Typography } from '@mui/material';
import { DICE_LIMITS } from './dice.js';
import SheetDialog from '../../ui/SheetDialog.jsx';
import { signed, withModifier } from '../../ui/numberFormat.js';
import { UI_COLORS } from '../../ui/colors.js';
import { UI_FONTS, FONT_SIZES } from '../../ui/fonts.js';
import { TEXT_STYLES } from '../../ui/textStyles.js';
import { ICON_SIZES } from '../../ui/iconSizes.js';
import Caption from '../../ui/Caption.jsx';
import CountStepper from '../../ui/CountStepper.jsx';
import DiceCountPicker from './DiceCountPicker.jsx';
import { GAME_ICONS } from '../../ui/gameIcons.js';

// Shared custom-roll dialog: a dice-count picker (d4…d100) plus a flat modifier
// that builds a formula string. It does NOT roll or show results itself — the
// caller passes `onRoll(formula)` and decides how to roll and where to surface
// the result (character sheet toast, encounter roll log + dice toast, …). This
// keeps the identical picker UI in one place across the app.

const DICE_TYPES = [2, 4, 6, 8, 10, 12, 20, 100];

// `footer`: a line under the dice (who will see the roll, for the GM).
export default function CustomRollDialog({
  open, onClose, onRoll, footer = null, ...dialogProps
}) {
  const [counts, setCounts] = useState(() => Object.fromEntries(DICE_TYPES.map((d) => [d, 0])));
  const [modifier, setModifier] = useState(0);

  const reset = () => {
    setCounts(Object.fromEntries(DICE_TYPES.map((d) => [d, 0])));
    setModifier(0);
  };

  const handleClose = () => {
    onClose?.();
    reset();
  };

  const adjustDie = (faces, delta) => {
    setCounts((prev) => {
      const total = Object.values(prev).reduce((sum, count) => sum + count, 0);
      if (delta > 0 && total >= DICE_LIMITS.maxDice) return prev;
      return { ...prev, [faces]: Math.max(0, (prev[faces] || 0) + delta) };
    });
  };

  const formula = withModifier(DICE_TYPES
    .filter((d) => counts[d] > 0)
    .map((d) => `${counts[d]}d${d}`)
    .join('+'), modifier);

  const hasSelection = DICE_TYPES.some((d) => counts[d] > 0);
  const totalDice = Object.values(counts).reduce((sum, count) => sum + count, 0);

  const handleRoll = () => {
    if (!formula || !hasSelection) return;
    onRoll?.(formula);
    handleClose();
  };

  return (
    <SheetDialog
      open={open}
      onClose={handleClose}
      title="Custom Roll"
      icon={<GAME_ICONS.roll size={ICON_SIZES.xl} />}
      actions={(
        <>
          <Button onClick={reset} variant="text" size="small" sx={{ color: 'text.secondary', mr: 'auto' }}>Reset</Button>
          <Button onClick={handleClose} variant="outlined" size="small" sx={{ color: 'text.secondary' }}>Close</Button>
          <Button onClick={handleRoll} variant="contained" size="small" disabled={!hasSelection}>
            Roll
          </Button>
        </>
      )}
      {...dialogProps}
    >
      <DiceCountPicker
        dice={DICE_TYPES}
        counts={counts}
        onStep={adjustDie}
        canDecrease={(_, count) => count > 0}
        canIncrease={() => totalDice < DICE_LIMITS.maxDice}
      />
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, py: 0.75 }}>
        <Typography sx={CUSTOM_ROLL_SX.modLabel}>Modifier</Typography>
        <CountStepper value={signed(modifier)} size={24} label="modifier" onStep={(delta) => setModifier((m) => m + delta)} />
      </Box>
      {/* The formula and the dice-cap lines always take their space, hidden when
          empty: the dialog is centred, so a line appearing on the first tap would
          shift every button under the next one. */}
      <Typography sx={{ ...CUSTOM_ROLL_SX.formula, visibility: hasSelection ? 'visible' : 'hidden' }}>
        {hasSelection ? formula : ' '}
      </Typography>
      <Caption sx={{ display: 'block', textAlign: 'center', visibility: totalDice >= DICE_LIMITS.maxDice ? 'visible' : 'hidden' }}>
        Maximum {DICE_LIMITS.maxDice} dice per roll.
      </Caption>
      {footer ? <Box sx={{ display: 'flex', justifyContent: 'center', pt: 1 }}>{footer}</Box> : null}
    </SheetDialog>
  );
}

const CUSTOM_ROLL_SX = {
  modLabel: { ...TEXT_STYLES.figure, fontSize: FONT_SIZES.md, color: 'text.secondary', mr: 0.5 },
  formula: { fontFamily: UI_FONTS.mono, fontSize: FONT_SIZES.lg, color: UI_COLORS.secondary, textAlign: 'center', py: 0.5 },
};
