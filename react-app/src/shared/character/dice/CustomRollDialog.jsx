import { useState } from 'react';
import { Box, Button, Typography } from '@mui/material';
import { Dices } from 'lucide-react';
import { DICE_LIMITS } from './dice.js';
import SheetDialog from '../../ui/SheetDialog.jsx';
import { signed, withModifier } from '../../ui/numberFormat.js';
import { UI_COLORS, uiAlpha, OPACITY } from '../../ui/colors.js';
import { UI_FONTS, FONT_SIZES } from '../../ui/fonts.js';
import { TEXT_STYLES } from '../../ui/textStyles.js';
import { ICON_SIZES } from '../../ui/iconSizes.js';
import { LIST_ROW_RULE_SX } from '../../../shared/ui/interactive.js';

// Shared custom-roll dialog: a dice-count picker (d4…d100) plus a flat modifier
// that builds a formula string. It does NOT roll or show results itself — the
// caller passes `onRoll(formula)` and decides how to roll and where to surface
// the result (character sheet toast, encounter roll log + dice toast, …). This
// keeps the identical picker UI in one place across the app.

const DICE_TYPES = [2, 4, 6, 8, 10, 12, 20, 100];

// A two-sided die is a coin, and calling it one is clearer than "d2" — it is
// also what gets thrown on the battle map. The formula it builds is still
// `Nd2`, which is what every roller in the app understands.
const DIE_LABELS = { 2: 'Coin' };
const dieLabel = (faces) => DIE_LABELS[faces] || `d${faces}`;

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
      icon={<Dices size={ICON_SIZES.xl} />}
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
      {DICE_TYPES.map((faces) => (
        <Box key={faces} sx={CUSTOM_ROLL_SX.diceRow}>
          <Typography sx={CUSTOM_ROLL_SX.diceLabel}>{dieLabel(faces)}</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Button size="small" variant="outlined" onClick={() => adjustDie(faces, -1)} disabled={!counts[faces]} sx={CUSTOM_ROLL_SX.stepBtn}>−</Button>
            <Typography sx={CUSTOM_ROLL_SX.countLabel}>{counts[faces] || 0}</Typography>
            <Button
              size="small"
              variant="outlined"
              onClick={() => adjustDie(faces, 1)}
              disabled={totalDice >= DICE_LIMITS.maxDice}
              sx={CUSTOM_ROLL_SX.stepBtn}
            >
              +
            </Button>
          </Box>
        </Box>
      ))}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, py: 0.75 }}>
        <Typography sx={CUSTOM_ROLL_SX.modLabel}>Modifier</Typography>
        <Button size="small" variant="outlined" onClick={() => setModifier((m) => m - 1)} sx={CUSTOM_ROLL_SX.stepBtn}>−</Button>
        <Typography sx={CUSTOM_ROLL_SX.countLabel}>{signed(modifier)}</Typography>
        <Button size="small" variant="outlined" onClick={() => setModifier((m) => m + 1)} sx={CUSTOM_ROLL_SX.stepBtn}>+</Button>
      </Box>
      {/* The formula and the dice-cap lines always take their space, hidden when
          empty: the dialog is centred, so a line appearing on the first tap would
          shift every button under the next one. */}
      <Typography sx={{ ...CUSTOM_ROLL_SX.formula, visibility: hasSelection ? 'visible' : 'hidden' }}>
        {hasSelection ? formula : ' '}
      </Typography>
      <Typography
        variant="caption"
        sx={{ color: 'text.secondary', display: 'block', textAlign: 'center', visibility: totalDice >= DICE_LIMITS.maxDice ? 'visible' : 'hidden' }}
      >
        Maximum {DICE_LIMITS.maxDice} dice per roll.
      </Typography>
      {footer ? <Box sx={{ display: 'flex', justifyContent: 'center', pt: 1 }}>{footer}</Box> : null}
    </SheetDialog>
  );
}

const CUSTOM_ROLL_SX = {
  diceRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 0.5, py: 0.5, ...LIST_ROW_RULE_SX },
  diceLabel: { ...TEXT_STYLES.figure, fontSize: FONT_SIZES.xl, color: 'text.primary', minWidth: 42 },
  countLabel: { ...TEXT_STYLES.figure, fontSize: FONT_SIZES.xxl, color: UI_COLORS.accentText, minWidth: 24, textAlign: 'center' },
  stepBtn: { minWidth: 28, px: 0.5, py: 0.25, fontSize: FONT_SIZES.xl, ...TEXT_STYLES.figure, color: UI_COLORS.accentText, borderColor: uiAlpha(UI_COLORS.accentText, OPACITY.line), '&:hover': { borderColor: UI_COLORS.accentText, bgcolor: uiAlpha(UI_COLORS.accentText, OPACITY.soft) } },
  modLabel: { ...TEXT_STYLES.figure, fontSize: FONT_SIZES.md, color: 'text.secondary', mr: 0.5 },
  formula: { fontFamily: UI_FONTS.mono, fontSize: FONT_SIZES.lg, color: UI_COLORS.secondary, textAlign: 'center', py: 0.5 },
};
