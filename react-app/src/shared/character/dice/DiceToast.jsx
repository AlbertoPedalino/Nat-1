import { useEffect } from 'react';
import { Box, Chip, Typography, IconButton } from '@mui/material';
import { X } from 'lucide-react';
import { resolveToastLayout } from './rollToastLayout.js';
import DiceRow from './DiceRow.jsx';
import { UI_COLORS, uiAlpha, OPACITY } from '../../ui/colors.js';
import { FONT_SIZES, LETTER_SPACINGS } from '../../ui/fonts.js';
import { UI_SHADOWS } from '../../ui/shadows.js';
import { TEXT_STYLES } from '../../ui/textStyles.js';

// Shared, not the character sheet's own: the sheet, the encounter builder and
// the battle map all show a roll the same way, and the layout behind it is
// shared too so they cannot drift apart.

const toastRootSx = {
  position: 'fixed', bottom: '1.2rem', right: '1.2rem', zIndex: 999,
  bgcolor: uiAlpha(UI_COLORS.surfaceDeep, OPACITY.solid), border: 2, borderColor: 'divider', borderRadius: 2,
  p: '1rem 1.2rem', minWidth: 260, maxWidth: 360,
  boxShadow: UI_SHADOWS.popup,
  backdropFilter: 'blur(8px)',
};

const modeChipSx = (chip) => ({
  height: 20, fontSize: FONT_SIZES.xxs, fontWeight: 700, letterSpacing: LETTER_SPACINGS.md,
  borderRadius: 1, mb: 0.25, color: chip.color, borderColor: chip.borderColor,
  bgcolor: chip.bgColor, '& .MuiChip-label': { px: 0.5 },
});

export default function DiceToast({ toast, onClose, hidden = false }) {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(onClose, 6000);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  // Keep the expiry running while hidden so returning to the map cannot revive
  // an old result that arrived during the background view.
  if (!toast || hidden) return null;

  const layout = resolveToastLayout(toast);
  // The moment of the throw: two rolls a second apart are two throws, and the
  // same throw re-rendered is still one.
  const seed = `${toast.timestamp || 0}:${layout.label}`;

  return (
    <Box sx={{
      ...toastRootSx,
      ...(layout.isCrit ? { borderColor: UI_COLORS.accentText, boxShadow: `${UI_SHADOWS.popup}, 0 0 20px ${uiAlpha(UI_COLORS.accentText, OPACITY.shade)}` } : {}),
      ...(layout.isFail ? { borderColor: UI_COLORS.danger, boxShadow: `${UI_SHADOWS.popup}, 0 0 20px ${uiAlpha(UI_COLORS.danger, OPACITY.shade)}` } : {}),
    }}>
      <IconButton size="small" onClick={onClose} sx={{ position: 'absolute', top: 6, right: 8, color: 'text.secondary' }}>
        <X size={14} />
      </IconButton>

      <Typography sx={{ ...TEXT_STYLES.label, fontSize: FONT_SIZES.sm, color: 'text.secondary', mb: 0.25 }}>
        {layout.label}
      </Typography>

      {layout.isCrit && (
        <Typography sx={{ ...TEXT_STYLES.title, fontSize: FONT_SIZES.lg, color: UI_COLORS.accentText, mb: 0.25 }}>
          NATURAL 20!
        </Typography>
      )}
      {layout.isFail && (
        <Typography sx={{ ...TEXT_STYLES.title, fontSize: FONT_SIZES.lg, color: UI_COLORS.danger, mb: 0.25 }}>
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
          ...TEXT_STYLES.figure, lineHeight: 1, textAlign: 'center', my: 0.25,
          fontSize: (layout.isCrit || layout.isFail) ? FONT_SIZES.hero : FONT_SIZES.heading,
          color: layout.totalColor,
        }}>
          {layout.total}
        </Typography>
      )}

      {layout.total == null && layout.dice.length === 0 && layout.detail && (
        <Typography sx={{ fontSize: FONT_SIZES.xl, color: 'text.primary', mt: 0.25 }}>
          {layout.detail}
        </Typography>
      )}
    </Box>
  );
}
