import { Box, Typography } from '@mui/material';
import { X } from 'lucide-react';
import { resolveToastLayout } from '../../../shared/character/dice/rollToastLayout.js';
import DiceRow from '../../../shared/character/dice/DiceRow.jsx';
import { VTT_COLORS } from '../../../shared/vtt/colors.js';
import { tintedSurfaceSx } from '../../../shared/ui/surfaces.js';
import { FONT_SIZES, LINE_HEIGHTS } from '../../../shared/ui/fonts.js';
import { rollToast } from '../../../shared/vtt/rolls/rollFeed.js';
import { TEXT_STYLES } from '../../../shared/ui/textStyles.js';
import { OPACITY, UI_COLORS } from '../../../shared/ui/colors.js';
import { ICON_SIZES } from '../../../shared/ui/iconSizes.js';
import { BUBBLE_FROM_TAIL_SX, BUBBLE_REST, BUBBLE_SHAKE_SX, bubbleCheerSx, bubbleSx, bubbleTailSx, splatSx, starburstSx } from '../../../shared/ui/bubble.js';
import BubbleDizzy from '../../../shared/ui/BubbleDizzy.jsx';
import BubbleSparkles from '../../../shared/ui/BubbleSparkles.jsx';
import { inkShadow } from '../../../shared/ui/shadows.js';
import TagChip from '../../../shared/ui/TagChip.jsx';
import { focusRingSx } from '../../../shared/ui/interactive.js';

// What somebody just rolled, over their piece. A speech bubble because that is
// what it is: a thing said at the table, not a record — it fades on its own and
// is never written anywhere.
//
// Laid out by the same function as the sheet's toast, so the player who rolled
// and the table watching the map read the same thing.
//
// With `onDismiss`, a tap anywhere on it closes it early: the bubble sits right
// over the pieces, and on a phone eight seconds is long to wait for the board
// back. The little cross only says that it can be closed.
export default function RollBubble({ roll, x, y, underFog = false, onDismiss }) {
  const layout = resolveToastLayout(rollToast(roll));

  return (
    // Outer box owns the position; the transform here must stay untouched, so
    // the entrance animation lives on the inner box instead.
    <Box sx={{
      ...rootSx,
      ...(underFog ? underFogSx : null),
      transform: `translate(${x}px, ${y}px) translate(-50%, -100%)`,
    }}>
      <Box
        {...(onDismiss ? {
          role: 'button',
          tabIndex: 0,
          'aria-label': 'Close roll',
          'data-viewport-control': true,
          // Not a pan, a drag or a long press on whatever is underneath.
          onPointerDown: (event) => event.stopPropagation(),
          onClick: (event) => {
            event.stopPropagation();
            onDismiss(roll.id);
          },
          onKeyDown: (event) => {
            if (event.key !== 'Enter' && event.key !== ' ' && event.key !== 'Escape') return;
            event.preventDefault();
            onDismiss(roll.id);
          },
        } : null)}
        sx={{
          ...rollBubbleSx,
          ...(layout.tone ? { boxShadow: inkShadow(layout.tone) } : {}),
          ...(layout.isCrit ? critSx : {}),
          ...(layout.isFail ? failSx : {}),
          ...(onDismiss ? dismissableSx : {}),
        }}
      >
        {/* A natural 20 sparkles all round the bubble; a natural 1 sees stars. */}
        {layout.isCrit ? <BubbleSparkles key={roll.id} /> : null}
        {layout.isFail ? <BubbleDizzy /> : null}
        {onDismiss ? (
          <Box aria-hidden sx={closeSx}>
            <X size={ICON_SIZES.xxs} strokeWidth={2.6} />
          </Box>
        ) : null}

        {roll.actorName ? <Typography sx={actorSx}>{roll.actorName}</Typography> : null}

        <Typography sx={{ ...labelSx, ...(layout.tone ? { color: layout.tone } : null) }}>{layout.label}</Typography>

        {layout.isCrit && <Typography sx={{ ...natSx, color: VTT_COLORS.accent }}>NATURAL 20!</Typography>}
        {layout.isFail && <Typography sx={{ ...natSx, color: VTT_COLORS.danger }}>NATURAL 1</Typography>}

        {layout.modeChip && (
          <TagChip label={layout.modeChip.label} tone={layout.modeChip.tone} filled={layout.modeChip.filled} sx={{ mb: 0.25 }} />
        )}

        <DiceRow
          dice={layout.dice}
          modifier={layout.modifier}
          modifierColor={layout.modifierColor}
          size={40}
          justify="center"
          seed={roll.id}
        />

        {layout.total != null && (
          <Typography sx={{
            ...totalSx,
            fontSize: (layout.isCrit || layout.isFail) ? FONT_SIZES.display : FONT_SIZES.heading,
            color: layout.isCrit || layout.isFail ? VTT_COLORS.text : layout.totalColor,
            ...(layout.isCrit ? starburstSx(VTT_COLORS.accent) : null),
            ...(layout.isFail ? splatSx(VTT_COLORS.danger) : null),
          }}>
            {layout.total}
          </Typography>
        )}

        {/* A rest or a death-save guard has no total and no dice — the line the
            roller saw is the whole message. */}
        {layout.total == null && layout.dice.length === 0 && layout.detail && (
          <Typography sx={detailSx}>{layout.detail}</Typography>
        )}

      </Box>
    </Box>
  );
}

const rootSx = {
  position: 'absolute',
  left: 0,
  top: 0,
  zIndex: 7,
  pointerEvents: 'none',
};

const underFogSx = { zIndex: 3 };

const rollBubbleSx = {
  position: 'relative',
  px: 1.25,
  py: 1,
  minWidth: 150,
  maxWidth: 260,
  textAlign: 'center',
  // The comic speech bubble, its tail on the token that speaks.
  ...bubbleSx({ pop: false }),
  ...bubbleTailSx({ side: 'bottom', at: '50%' }),
  ...BUBBLE_FROM_TAIL_SX,
};

const dismissableSx = {
  pointerEvents: 'auto',
  cursor: 'pointer',
  // Room for the cross, so it never sits on the actor's name.
  px: 2.25,
  ...focusRingSx({ tone: VTT_COLORS.accent }),
};

const closeSx = {
  position: 'absolute',
  zIndex: 3,
  top: 4,
  right: 4,
  width: 16,
  height: 16,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '50%',
  color: 'text.secondary',
  // Darkened over the bubble's own fill, so the button stays solid.
  ...tintedSurfaceSx(VTT_COLORS.black, { amount: OPACITY.line, base: UI_COLORS.bubble }),
};

// A natural 20 or 1 throws the bubble's shadow in its own colour.
// A natural 20 cheers: the bubble leaps and springs, then rests on the token.
const critSx = { boxShadow: inkShadow(VTT_COLORS.accent, 4), ...bubbleCheerSx(BUBBLE_REST) };

const failSx = { boxShadow: inkShadow(VTT_COLORS.danger), ...BUBBLE_SHAKE_SX };

const actorSx = {
  ...TEXT_STYLES.figure,
  fontSize: FONT_SIZES.xs,
  color: VTT_COLORS.accent,
  lineHeight: LINE_HEIGHTS.tight,
};

// The roll's name, lettered like the sheet toast's.
const labelSx = {
  ...TEXT_STYLES.shout,
  fontSize: FONT_SIZES.xxl,
  color: 'text.primary',
  mb: 0.25,
};

const natSx = {
  ...TEXT_STYLES.shout,
  fontSize: FONT_SIZES.lg,
  mb: 0.25,
};



// A roll's numbers are shouted, as on the sheet's toast.
const totalSx = {
  ...TEXT_STYLES.shout,
  lineHeight: LINE_HEIGHTS.none,
  my: 0.25,
};

const detailSx = {
  fontSize: FONT_SIZES.sm,
  color: 'text.primary',
  lineHeight: LINE_HEIGHTS.normal,
};

