import { Box } from '@mui/material';
import { resolveToastLayout } from '../../../shared/character/dice/rollToastLayout.js';
import { VTT_COLORS } from '../../../shared/vtt/colors.js';
import { rollToast } from '../../../shared/vtt/rolls/rollFeed.js';
import { BUBBLE_FROM_TAIL_SX, BUBBLE_REST, bubbleSx, bubbleTailSx } from '../../../shared/ui/bubble.js';
import { useRollMoment } from '../../../shared/ui/rollMoment.js';
import RollMomentEffect from '../../../shared/ui/RollMomentEffect.jsx';
import { focusRingSx } from '../../../shared/ui/interactive.js';
import { useLiveStyle } from '../../../shared/ui/liveStyle.js';
import { hungOverStyle } from '../map/viewportGeometry.js';
import StyleScope from '../../../app/StyleScope.jsx';
import DrawnToast, { useDrawnToast } from '../../../shared/ui/DrawnToast.jsx';
import RollSaid from '../../../shared/character/dice/RollSaid.jsx';

// What somebody just rolled, over their piece. A speech bubble because that is
// what it is: a thing said at the table, not a record — it fades on its own and
// is never written anywhere.
//
// It says what the sheet's toast says, in the same words (RollSaid.jsx), so
// the player who rolled and the table watching the map read the same thing.
//
// With `onDismiss`, a tap anywhere on it closes it early: the bubble sits right
// over the pieces, and on a phone eight seconds is long to wait for the board
// back. The little cross only says that it can be closed.
//
// It is drawn in the style of the player who rolled it (`roll.style`,
// StyleScope), whatever style each screen wears: the table sees the bubble,
// and its natural 20 or 1, as the roller does. Where that style draws a roll
// in place of its bubble (shapes.js rollToast.drawing), so it is drawn here:
// the same drawn thing as the roller's toast (DrawnToast.jsx), smaller.
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
  // Its colour, and a natural 20's or 1's moment (rollMoment.js), resting back
  // on the piece as the bubble does.
  const drawn = useRollMoment(layout, BUBBLE_REST);
  const { moment } = drawn;

  const { kind: drawing, drawn: drawnToast } = useDrawnToast();

  const dismiss = onDismiss ? {
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
  } : null;

  const said = <RollSaid layout={layout} moment={drawn} size="bubble" seed={roll.id} rolledWith={roll.dice} actor={roll.actorName} hint={Boolean(onDismiss)} />;

  if (drawnToast) {
    return (
      <DrawnToast kind={drawing} moment={moment} seed={roll.id} compact {...dismiss} sx={{ ...drawnBubbleSx, ...(onDismiss ? dismissableSx : null) }}>
        {said}
      </DrawnToast>
    );
  }

  return (
    <Box {...dismiss} sx={{ ...rollBubbleSx, ...drawn.bubbleSx, ...(onDismiss ? dismissableSx : null) }}>
      <RollMomentEffect key={roll.id} moment={moment} seed={roll.id} />
      {said}
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

// A roll drawn in place of the bubble (DrawnToast.jsx): standing on the piece
// that rolled, rising from it as the bubble does.
const drawnBubbleSx = { minWidth: 180, maxWidth: 260, ...BUBBLE_FROM_TAIL_SX };

const dismissableSx = {
  pointerEvents: 'auto',
  cursor: 'pointer',
  ...focusRingSx({ tone: VTT_COLORS.accent }),
};
