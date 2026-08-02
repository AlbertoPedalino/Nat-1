import { useEffect } from 'react';
import { Box, Chip, Typography, IconButton } from '@mui/material';
import { X } from 'lucide-react';
import { resolveToastLayout } from './rollToastLayout.js';
import DiceRow from './DiceRow.jsx';

const FONT = '"Cinzel", Georgia, serif';

// Shared, not the character sheet's own: the sheet, the encounter builder and
// the battle map all show a roll the same way, and the layout behind it is
// shared too so they cannot drift apart.

const toastRootSx = {
  position: 'fixed', bottom: '1.2rem', right: '1.2rem', zIndex: 999,
  bgcolor: 'rgba(26,23,19,0.97)', border: 2, borderColor: 'divider', borderRadius: 2,
  p: '1rem 1.2rem', minWidth: 260, maxWidth: 360,
  boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
  backdropFilter: 'blur(8px)',
};

const modeChipSx = (chip) => ({
  height: 20, fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.06em',
  borderRadius: 1, mb: 0.3, color: chip.color, borderColor: chip.borderColor,
  bgcolor: chip.bgColor, '& .MuiChip-label': { px: 0.5 },
});

export default function DiceToast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(onClose, 6000);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;

  const layout = resolveToastLayout(toast);
  // The moment of the throw: two rolls a second apart are two throws, and the
  // same throw re-rendered is still one.
  const seed = `${toast.timestamp || 0}:${layout.label}`;

  return (
    <Box sx={{
      ...toastRootSx,
      ...(layout.isCrit ? { borderColor: '#edd48a', boxShadow: '0 8px 32px rgba(0,0,0,0.6), 0 0 20px rgba(237,212,138,0.25)' } : {}),
      ...(layout.isFail ? { borderColor: '#de675f', boxShadow: '0 8px 32px rgba(0,0,0,0.6), 0 0 20px rgba(222,103,95,0.25)' } : {}),
    }}>
      <IconButton size="small" onClick={onClose} sx={{ position: 'absolute', top: 6, right: 8, color: 'text.secondary' }}>
        <X size={14} />
      </IconButton>

      <Typography sx={{ fontFamily: FONT, fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'text.secondary', mb: 0.3 }}>
        {layout.label}
      </Typography>

      {layout.isCrit && (
        <Typography sx={{ fontFamily: FONT, fontSize: '0.75rem', fontWeight: 900, letterSpacing: '0.1em', color: '#edd48a', mb: 0.3 }}>
          NATURAL 20!
        </Typography>
      )}
      {layout.isFail && (
        <Typography sx={{ fontFamily: FONT, fontSize: '0.75rem', fontWeight: 900, letterSpacing: '0.1em', color: '#de675f', mb: 0.3 }}>
          NATURAL 1
        </Typography>
      )}

      {layout.modeChip && (
        <Chip size="small" label={layout.modeChip.label} variant="outlined" sx={modeChipSx(layout.modeChip)} />
      )}

      <DiceRow
        // Keyed by the throw, not just seeded by it: rolling again while the
        // toast is still up replaces its contents rather than remounting them,
        // and a CSS animation that never remounts never plays again.
        key={seed}
        dice={layout.dice}
        modifier={layout.modifier}
        size={58}
        seed={seed}
        // The whole solid, however many faces it has: a toast shows one roll at
        // a time, and this is where you actually look at what came up. A fistful
        // of hundred-sided dice is thousands of separately composited planes, so
        // a big handful still falls back to the face they landed on.
        solid={layout.dice.length <= 3}
      />

      {layout.total != null && (
        <Typography sx={{
          fontFamily: FONT, fontWeight: 900, lineHeight: 1, textAlign: 'center', my: 0.3,
          fontSize: (layout.isCrit || layout.isFail) ? '2rem' : '1.5rem',
          color: layout.totalColor,
        }}>
          {layout.total}
        </Typography>
      )}

      {layout.total == null && layout.dice.length === 0 && layout.detail && (
        <Typography sx={{ fontSize: '0.8rem', color: 'text.primary', mt: 0.2 }}>
          {layout.detail}
        </Typography>
      )}
    </Box>
  );
}
