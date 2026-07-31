import { useState } from 'react';
import { Box, Button, Typography } from '@mui/material';
import { Dices } from 'lucide-react';
import SheetDialog from './SheetDialog.jsx';

// Shared custom-roll dialog: a dice-count picker (d4…d100) plus a flat modifier
// that builds a formula string. It does NOT roll or show results itself — the
// caller passes `onRoll(formula)` and decides how to roll and where to surface
// the result (character sheet toast, encounter roll log + dice toast, …). This
// keeps the identical picker UI in one place across the app.

const DICE_TYPES = [2, 4, 6, 8, 10, 12, 20, 100];

export default function CustomRollDialog({ open, onClose, onRoll }) {
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
    setCounts((prev) => ({ ...prev, [faces]: Math.max(0, (prev[faces] || 0) + delta) }));
  };

  const formula = DICE_TYPES
    .filter((d) => counts[d] > 0)
    .map((d) => `${counts[d]}d${d}`)
    .join('+') + (modifier !== 0 ? (modifier > 0 ? `+${modifier}` : `${modifier}`) : '');

  const hasSelection = DICE_TYPES.some((d) => counts[d] > 0);

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
      icon={<Dices size={20} />}
      actions={(
        <>
          <Button onClick={reset} variant="text" size="small" sx={{ color: 'text.secondary', mr: 'auto' }}>Reset</Button>
          <Button onClick={handleClose} variant="outlined" size="small" sx={{ color: 'text.secondary' }}>Close</Button>
          <Button onClick={handleRoll} variant="contained" size="small" disabled={!hasSelection}>
            Roll
          </Button>
        </>
      )}
    >
      {DICE_TYPES.map((faces) => (
        <Box key={faces} sx={CUSTOM_ROLL_SX.diceRow}>
          <Typography sx={CUSTOM_ROLL_SX.diceLabel}>d{faces}</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
            <Button size="small" variant="outlined" onClick={() => adjustDie(faces, -1)} disabled={!counts[faces]} sx={CUSTOM_ROLL_SX.stepBtn}>−</Button>
            <Typography sx={CUSTOM_ROLL_SX.countLabel}>{counts[faces] || 0}</Typography>
            <Button size="small" variant="outlined" onClick={() => adjustDie(faces, 1)} sx={CUSTOM_ROLL_SX.stepBtn}>+</Button>
          </Box>
        </Box>
      ))}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, py: 0.8 }}>
        <Typography sx={CUSTOM_ROLL_SX.modLabel}>Modifier</Typography>
        <Button size="small" variant="outlined" onClick={() => setModifier((m) => m - 1)} sx={CUSTOM_ROLL_SX.stepBtn}>−</Button>
        <Typography sx={CUSTOM_ROLL_SX.countLabel}>{modifier >= 0 ? `+${modifier}` : modifier}</Typography>
        <Button size="small" variant="outlined" onClick={() => setModifier((m) => m + 1)} sx={CUSTOM_ROLL_SX.stepBtn}>+</Button>
      </Box>
      {hasSelection && (
        <Typography sx={CUSTOM_ROLL_SX.formula}>{formula}</Typography>
      )}
    </SheetDialog>
  );
}

const CUSTOM_ROLL_SX = {
  diceRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 0.5, py: 0.4, borderBottom: 1, borderColor: 'divider' },
  diceLabel: { fontFamily: '"Cinzel", Georgia, serif', fontSize: '0.8rem', fontWeight: 700, color: 'text.primary', minWidth: 42 },
  countLabel: { fontFamily: '"Cinzel", Georgia, serif', fontSize: '0.9rem', fontWeight: 700, color: '#edd48a', minWidth: 24, textAlign: 'center' },
  stepBtn: { minWidth: 28, px: 0.4, py: 0.2, fontSize: '0.8rem', fontFamily: '"Cinzel", Georgia, serif', fontWeight: 700, color: '#edd48a', borderColor: 'rgba(237,212,138,0.35)', '&:hover': { borderColor: '#edd48a', bgcolor: 'rgba(237,212,138,0.08)' } },
  modLabel: { fontFamily: '"Cinzel", Georgia, serif', fontSize: '0.7rem', color: 'text.secondary', mr: 0.5 },
  formula: { fontFamily: '"JetBrains Mono", monospace', fontSize: '0.75rem', color: '#70b7a6', textAlign: 'center', py: 0.5 },
};
