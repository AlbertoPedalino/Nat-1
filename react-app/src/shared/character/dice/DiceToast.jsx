import { useEffect } from 'react';
import { LAYERS } from '../../ui/layers.js';
import { Box, Chip, Typography, IconButton } from '@mui/material';
import { X } from 'lucide-react';
import { resolveToastLayout } from './rollToastLayout.js';
import DiceRow from './DiceRow.jsx';
import { UI_COLORS } from '../../ui/colors.js';
import { FONT_SIZES, LETTER_SPACINGS, FONT_WEIGHTS, LINE_HEIGHTS } from '../../ui/fonts.js';
import { TEXT_STYLES } from '../../ui/textStyles.js';
import { ICON_SIZES } from '../../ui/iconSizes.js';
import { CONTROL_HEIGHTS } from '../../ui/controlHeights.js';
import { SHOUT_TILT, bubbleSx, bubbleTailSx, comicShadow } from '../../ui/bubble.js';

// Shared, not the character sheet's own: the sheet, the encounter builder and
// the battle map all show a roll the same way, and the layout behind it is
// shared too so they cannot drift apart.

const toastRootSx = {
  position: 'fixed', bottom: '1.2rem', right: '1.2rem', zIndex: LAYERS.diceToast,
  // A speech bubble, its tail pointing down at the corner the roll came from.
  ...bubbleSx(), ...bubbleTailSx({ side: 'bottom', at: '82%' }),
  p: '1rem 1.2rem', minWidth: 260, maxWidth: 360,
  // No backdrop blur: behind a 95%-opaque surface it could not be seen, and
  // over the battle map, where something always moves underneath, it was
  // recomputed every frame — the roller's map fell to about ten frames a
  // second for as long as the toast was up.
};

const modeChipSx = (chip) => ({
  height: CONTROL_HEIGHTS.sm, fontSize: FONT_SIZES.xxs, fontWeight: FONT_WEIGHTS.bold, letterSpacing: LETTER_SPACINGS.md,
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
      // A natural 20 or 1 throws its shadow in its own colour.
      ...(layout.isCrit ? { boxShadow: comicShadow(UI_COLORS.accent, 4), transform: SHOUT_TILT } : {}),
      ...(layout.isFail ? { boxShadow: comicShadow(UI_COLORS.danger) } : {}),
    }}>
      <IconButton size="small" onClick={onClose} sx={{ position: 'absolute', top: 6, right: 8, color: 'text.secondary' }}>
        <X size={ICON_SIZES.sm} />
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
          ...TEXT_STYLES.figure, lineHeight: LINE_HEIGHTS.none, textAlign: 'center', my: 0.25,
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
