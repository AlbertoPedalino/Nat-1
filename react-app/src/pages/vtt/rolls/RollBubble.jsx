import { Box, Typography } from '@mui/material';
import { resolveToastLayout } from '../../../shared/character/dice/rollToastLayout.js';
import DiceRow from '../../../shared/character/dice/DiceRow.jsx';
import { VTT_COLORS } from '../../../shared/vtt/colors.js';
import { FONT_SIZES, LINE_HEIGHTS } from '../../../shared/ui/fonts.js';
import { rollToast } from '../../../shared/vtt/rolls/rollFeed.js';
import { TEXT_STYLES } from '../../../shared/ui/textStyles.js';
import { BUBBLE_FROM_TAIL_SX, BUBBLE_REST, bubbleSx, bubbleTailSx, bubbleToneSx } from '../../../shared/ui/bubble.js';
import { momentBurstSx, rollMoment, useRollMoment } from '../../../shared/ui/rollMoment.js';
import RollMomentEffect from '../../../shared/ui/RollMomentEffect.jsx';
import TagChip from '../../../shared/ui/TagChip.jsx';
import { focusRingSx } from '../../../shared/ui/interactive.js';
import { useLiveStyle } from '../../../shared/ui/liveStyle.js';
import { hungOverStyle } from '../map/viewportGeometry.js';
import BubbleHeader from '../../../shared/ui/BubbleHeader.jsx';
import StyleScope from '../../../app/StyleScope.jsx';

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
//
// It is drawn in the style of the player who rolled it (`roll.style`,
// StyleScope), whatever style each screen wears: the table sees the bubble,
// and its natural 20 or 1, as the roller does.
export default function RollBubble({ roll, x, y, underFog = false, onDismiss }) {
  // It rides the board through a pan: its place is written onto the element
  // (useLiveStyle), not into sx.
  const placeRef = useLiveStyle(hungOverStyle(x, y));

  return (
    // Outer box owns the position; the transform here must stay untouched, so
    // the entrance animation lives on the inner box instead.
    <Box ref={placeRef} sx={{ ...rootSx, ...(underFog ? underFogSx : null) }}>
      <StyleScope styleId={roll.style}>
        <RollBubbleCard roll={roll} onDismiss={onDismiss} />
      </StyleScope>
    </Box>
  );
}

// The bubble itself, in the style its scope draws.
function RollBubbleCard({ roll, onDismiss }) {
  const layout = resolveToastLayout(rollToast(roll));
  // A natural 20 or 1: the style's moment (rollMoment.js), resting back on the
  // piece as the bubble does.
  const moment = rollMoment(layout);
  const drawn = useRollMoment(moment, BUBBLE_REST);

  return (
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
          ...(layout.tone ? bubbleToneSx(layout.tone) : null),
          ...drawn?.bubbleSx,
          ...(onDismiss ? dismissableSx : {}),
        }}
      >
        <RollMomentEffect key={roll.id} moment={moment} seed={roll.id} />
        <BubbleHeader hint={Boolean(onDismiss)} centered>
          {roll.actorName ? <Typography sx={actorSx}>{roll.actorName}</Typography> : null}
          <Typography sx={{ ...labelSx, ...(layout.tone ? { color: layout.tone } : null) }}>{layout.label}</Typography>
        </BubbleHeader>

        {drawn ? <Typography sx={{ ...natSx, color: drawn.labelColor }}>{drawn.label}</Typography> : null}

        {layout.modeChip && (
          <TagChip label={layout.modeChip.label} tone={layout.modeChip.tone} sx={{ mb: 0.25 }} />
        )}

        <DiceRow
          dice={layout.dice}
          modifier={layout.modifier}
          modifierColor={layout.modifierColor}
          size={40}
          justify="center"
          seed={roll.id}
          rolledWith={roll.dice}
        />

        {layout.total != null && (
          <Typography sx={{
            ...totalSx,
            fontSize: (layout.isCrit || layout.isFail) ? FONT_SIZES.display : FONT_SIZES.heading,
            color: layout.isCrit || layout.isFail ? VTT_COLORS.text : layout.totalColor,
            ...(moment ? { ...momentBurstSx(moment), ...drawn.numberSx } : null),
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
  ...focusRingSx({ tone: VTT_COLORS.accent }),
};

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

