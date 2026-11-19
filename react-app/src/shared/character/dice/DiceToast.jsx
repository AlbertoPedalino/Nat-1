import { useEffect } from 'react';
import { LAYERS } from '../../ui/layers.js';
import { Box, Typography } from '@mui/material';
import { resolveToastLayout } from './rollToastLayout.js';
import DiceRow from './DiceRow.jsx';
import { UI_COLORS } from '../../ui/colors.js';
import { FONT_SIZES, LINE_HEIGHTS } from '../../ui/fonts.js';
import { TEXT_STYLES } from '../../ui/textStyles.js';
import { SHOUT_TILT, bubbleSx, bubbleTailSx } from '../../ui/bubble.js';
import { bubbleTone } from '../../ui/bubbleLooks.js';
import { useRollMoment } from '../../ui/rollMoment.js';
import RollMomentEffect from '../../ui/RollMomentEffect.jsx';
import { useWarmRolls } from './warmRolls.js';
import TagChip from '../../ui/TagChip.jsx';
import BubbleHeader from '../../ui/BubbleHeader.jsx';

// Shared, not the character sheet's own: the sheet, the encounter builder and
// the battle map all show a roll the same way, and the layout behind it is
// shared too so they cannot drift apart.

const toastRootSx = {
  position: 'fixed', bottom: '1.2rem', right: '1.2rem', zIndex: LAYERS.diceToast,
  // A speech bubble, its tail pointing down at the dice dock the roll came from.
  ...bubbleSx(), ...bubbleTailSx({ side: 'bottom', at: '82%' }),
  p: '1rem 1.2rem', minWidth: 260, maxWidth: 360,
  // No backdrop blur: behind a 95%-opaque surface it could not be seen, and
  // over the battle map, where something always moves underneath, it was
  // recomputed every frame — the roller's map fell to about ten frames a
  // second for as long as the toast was up.
};


export default function DiceToast({ toast, onClose, hidden = false }) {
  // What a roll draws worked out ahead, so the first one after a page load
  // does not restyle the page as it shows (warmRolls.js).
  useWarmRolls();
  const layout = toast ? resolveToastLayout(toast) : null;
  // Its colour, and a natural 20's or 1's moment (rollMoment.js).
  const drawn = useRollMoment(layout, SHOUT_TILT);
  const { moment } = drawn;

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(onClose, 6000);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  // Keep the expiry running while hidden so returning to the map cannot revive
  // an old result that arrived during the background view.
  if (!toast || hidden) return null;

  // The moment of the throw: two rolls a second apart are two throws, and the
  // same throw re-rendered is still one.
  const seed = `${toast.timestamp || 0}:${layout.label}`;

  return (
    <Box sx={{
      ...toastRootSx,
      // The roll's colour throws the bubble's shadow; a 20 or a 1 its own.
      ...drawn.bubbleSx,
    }}>
      <RollMomentEffect key={`moment:${seed}`} moment={moment} seed={seed} />
      <BubbleHeader onClose={onClose}>
        <Typography sx={{ ...TEXT_STYLES.shout, fontSize: FONT_SIZES.title, color: bubbleTone(layout.tone || UI_COLORS.textPrimary), mb: 0.25 }}>
          {layout.label}
        </Typography>
      </BubbleHeader>

      {drawn.label ? (
        <Typography sx={{ ...TEXT_STYLES.shout, fontSize: FONT_SIZES.title, color: bubbleTone(drawn.labelColor), mb: 0.25 }}>
          {drawn.label}
        </Typography>
      ) : null}

      {layout.modeChip && (
        <TagChip label={layout.modeChip.label} tone={layout.modeChip.tone} sx={{ mb: 0.25 }} />
      )}

      <DiceRow
        // Keyed by the throw, not just seeded by it: rolling again while the
        // toast is still up replaces its contents rather than remounting them,
        // and a CSS animation that never remounts never plays again.
        key={`dice:${seed}`}
        dice={layout.dice}
        modifier={layout.modifier}
        modifierColor={layout.modifierColor && bubbleTone(layout.modifierColor)}
        size={58}
        seed={seed}
        rolledWith={toast?.dice}
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
            // A natural 20 or 1 is written light on its burst, the ink outline
            // keeping it legible on the gold as on the red.
            color: layout.isCrit || layout.isFail ? UI_COLORS.textPrimary : bubbleTone(layout.totalColor),
            ...(drawn.totalSx ?? { display: 'inline-block' }),
          }}>
            {layout.total}
          </Typography>
        </Box>
      )}

      {layout.total == null && layout.dice.length === 0 && layout.detail && (
        <Typography sx={{ fontSize: FONT_SIZES.xl, color: UI_COLORS.textPrimary, mt: 0.25 }}>
          {layout.detail}
        </Typography>
      )}
    </Box>
  );
}
