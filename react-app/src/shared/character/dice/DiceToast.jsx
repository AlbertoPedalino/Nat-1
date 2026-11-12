import { useEffect } from 'react';
import { LAYERS } from '../../ui/layers.js';
import { Box, Typography, IconButton } from '@mui/material';
import { X } from 'lucide-react';
import { resolveToastLayout } from './rollToastLayout.js';
import DiceRow from './DiceRow.jsx';
import { UI_COLORS } from '../../ui/colors.js';
import { FONT_SIZES, LINE_HEIGHTS } from '../../ui/fonts.js';
import { TEXT_STYLES } from '../../ui/textStyles.js';
import { ICON_SIZES } from '../../ui/iconSizes.js';
import { BUBBLE_SHAKE_SX, SHOUT_TILT, bubbleCheerSx, bubbleSx, bubbleTailSx, splatSx, starburstSx } from '../../ui/bubble.js';
import { inkOn } from '../../ui/pressable.js';
import { celebrateNatural20 } from '../../ui/celebrate.js';
import BubbleDizzy from '../../ui/BubbleDizzy.jsx';
import { inkShadow } from '../../ui/shadows.js';
import TagChip from '../../ui/TagChip.jsx';

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


export default function DiceToast({ toast, onClose, hidden = false }) {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(onClose, 6000);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  // A natural 20 throws confetti from the toast's corner, once a throw (a
  // natural 1 leaves the bubble seeing stars instead, below).
  const crit = Boolean(toast && !hidden && resolveToastLayout(toast).isCrit);
  useEffect(() => {
    if (crit) celebrateNatural20();
  }, [crit, toast?.timestamp]);

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
      // The roll's colour throws the bubble's shadow; a 20 or a 1 its own.
      ...(layout.tone ? { boxShadow: inkShadow(layout.tone) } : {}),
      ...(layout.isCrit ? { boxShadow: inkShadow(UI_COLORS.accent, 4), ...bubbleCheerSx(SHOUT_TILT) } : {}),
      ...(layout.isFail ? { boxShadow: inkShadow(UI_COLORS.danger), ...BUBBLE_SHAKE_SX } : {}),
    }}>
      {layout.isFail ? <BubbleDizzy key={seed} /> : null}
      <IconButton size="small" onClick={onClose} sx={{ position: 'absolute', top: 6, right: 8, color: 'text.secondary', zIndex: 3 }}>
        <X size={ICON_SIZES.sm} />
      </IconButton>

      <Typography sx={{ ...TEXT_STYLES.shout, fontSize: FONT_SIZES.title, color: layout.tone || 'text.primary', mb: 0.25 }}>
        {layout.label}
      </Typography>

      {layout.isCrit && (
        <Typography sx={{ ...TEXT_STYLES.shout, fontSize: FONT_SIZES.title, color: UI_COLORS.accentText, mb: 0.25 }}>
          NATURAL 20!
        </Typography>
      )}
      {layout.isFail && (
        <Typography sx={{ ...TEXT_STYLES.shout, fontSize: FONT_SIZES.title, color: UI_COLORS.danger, mb: 0.25 }}>
          NATURAL 1
        </Typography>
      )}

      {layout.modeChip && (
        <TagChip label={layout.modeChip.label} tone={layout.modeChip.tone} sx={{ mb: 0.25 }} />
      )}

      <DiceRow
        // Keyed by the throw, not just seeded by it: rolling again while the
        // toast is still up replaces its contents rather than remounting them,
        // and a CSS animation that never remounts never plays again.
        key={seed}
        dice={layout.dice}
        modifier={layout.modifier}
        modifierColor={layout.modifierColor}
        size={58}
        seed={seed}
        // The whole solid, however many faces it has: a toast shows one roll at
        // a time, and this is where you actually look at what came up. A fistful
        // of hundred-sided dice is thousands of separately composited planes, so
        // a big handful still falls back to the face they landed on.
        solid={layout.dice.length <= 3}
      />

      {layout.total != null && (
        <Box sx={{ textAlign: 'center', my: 0.25 }}>
          <Typography component="span" sx={{
            // A roll's numbers are shouted, in the comic's lettering.
            ...TEXT_STYLES.shout, lineHeight: LINE_HEIGHTS.none,
            fontSize: (layout.isCrit || layout.isFail) ? FONT_SIZES.hero : FONT_SIZES.display,
            color: layout.isCrit ? inkOn(UI_COLORS.accent) : layout.isFail ? UI_COLORS.textPrimary : layout.totalColor,
            ...(layout.isCrit ? starburstSx(UI_COLORS.accent) : null),
            ...(layout.isFail ? splatSx(UI_COLORS.dangerDeep) : null),
            ...(!layout.isCrit && !layout.isFail ? { display: 'inline-block' } : null),
          }}>
            {layout.total}
          </Typography>
        </Box>
      )}

      {layout.total == null && layout.dice.length === 0 && layout.detail && (
        <Typography sx={{ fontSize: FONT_SIZES.xl, color: 'text.primary', mt: 0.25 }}>
          {layout.detail}
        </Typography>
      )}
    </Box>
  );
}
