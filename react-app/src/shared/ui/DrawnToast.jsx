import { Box } from '@mui/material';
import { UI_COLORS } from './colors.js';
import { bubbleTone } from './bubbleLooks.js';
import { useStyleShapes } from './themeIds.js';
import { STILL_WHEN_REDUCED, TOAST_MOTION, motionTime } from './motion.js';
import { TOAST_HAND_BOX, drawsToast, toastBloom, toastBlooms, toastClimbers, toastFrame, toastHand, toastHead } from './toastDrawing.js';
import MeasuredDrawing from './MeasuredDrawing.jsx';
import HandDrawnSvg from './HandDrawnSvg.jsx';

// A roll shown on what the style draws in place of its bubble (shapes.js
// rollToast.drawing, toastDrawing.js: the gothic's tombstone): the drawn
// thing to the size of what the roll says (`children`), centred on it, and
// the roll's `moment` its own way. The sheet's toast (DiceToast) and the
// bubble over a piece on the map (RollBubble) are both this, so the roller
// and the table see one thing; `compact` is the smaller of the two, over a
// piece. Where it stands is its caller's (`sx`); `seed` names the throw, so a
// new one plays its moment again.

const ROOT_SX = { position: 'relative' };
const FACE_SX = {
  position: 'relative',
  isolation: 'isolate',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  textAlign: 'center',
  px: 2.5,
  pb: 2,
  transformOrigin: '50% 100%',
};
const COMPACT_FACE_SX = { px: 2, pb: 1.5 };

// A natural 20: what it grows (the tombstone's roses) climbing its two sides
// from the foot, each stem's rose opening as the stem reaches it. Over the
// toast, to its size, never in its way.
const GARDEN_SX = { position: 'absolute', inset: 0, pointerEvents: 'none' };
const GROW_SX = {
  position: 'absolute',
  inset: 0,
  animation: `gbToastGrow ${motionTime(TOAST_MOTION.grow)} both ease-out`,
  // Uncovered from the foot up; past its sides, where a stem sways out.
  '@keyframes gbToastGrow': { from: { clipPath: 'inset(100% -24px 0 -24px)' }, to: { clipPath: 'inset(-24px)' } },
  ...STILL_WHEN_REDUCED,
};
const BLOOM_SX = {
  position: 'absolute',
  translate: '-50% 50%',
  animation: `gbToastBloom ${motionTime(TOAST_MOTION.bloom)} both cubic-bezier(.3, 1.7, .5, 1)`,
  '@keyframes gbToastBloom': { from: { transform: 'scale(0)' }, to: { transform: 'scale(1)' } },
  ...STILL_WHEN_REDUCED,
};

// A natural 1: it leans, and what it raises (the tombstone's hand) claws up
// before it, out of the foot of the toast; smaller before a compact one.
const LEAN_SX = {
  animation: `gbToastLean ${motionTime(TOAST_MOTION.lean)} ${motionTime(TOAST_MOTION.leanAfter)} both cubic-bezier(.3, 1.5, .5, 1)`,
  '@keyframes gbToastLean': { to: { transform: 'rotate(-5deg) translateX(-5px)' } },
  ...STILL_WHEN_REDUCED,
};
const GRAVE_SX = { position: 'absolute', left: 0, right: 0, bottom: -2, height: 150, overflow: 'hidden', pointerEvents: 'none' };
const HAND_SX = {
  position: 'absolute',
  left: '60%',
  bottom: -40,
  ...TOAST_HAND_BOX,
  transformOrigin: '50% 100%',
  animation: `gbToastClaw ${motionTime(TOAST_MOTION.claw)} ${motionTime(TOAST_MOTION.clawAfter)} both`,
  '@keyframes gbToastClaw': {
    '0%': { transform: 'translateY(100%) rotate(7deg)' },
    '36%': { transform: 'translateY(2%) rotate(-7deg)' },
    '50%': { transform: 'translateY(15%) rotate(5deg)' },
    '66%': { transform: 'translateY(0) rotate(-4deg)' },
    '82%': { transform: 'translateY(6%) rotate(2deg)' },
    '100%': { transform: 'translateY(2%) rotate(-2deg)' },
  },
  ...STILL_WHEN_REDUCED,
};
const COMPACT_HAND_SX = { left: '54%', bottom: -30, scale: '0.7' };

// How the style in use shows a roll: the `kind` it draws it as, whether that
// is a drawn toast (`drawn`) or its bubble, and a colour as it is `written`
// on either: on a bubble as the bubble's paper takes it, on a drawn toast as
// it is.
const asIs = (color) => color;
export function useDrawnToast() {
  const kind = useStyleShapes().rollToast.drawing;
  const drawn = drawsToast(kind);
  return { kind, drawn, written: drawn ? asIs : bubbleTone };
}

// The colour a roll's total is carved in on a drawn toast (`layout`:
// rollToastLayout.js): gold at a natural 20, plain at a natural 1, the roll's
// own otherwise.
export function drawnTotalColor(layout) {
  if (layout.isCrit) return UI_COLORS.warning;
  return layout.isFail ? UI_COLORS.textPrimary : layout.totalColor;
}

export default function DrawnToast({ kind, moment, seed, compact = false, sx, children, ...root }) {
  return (
    <Box {...root} sx={[ROOT_SX, sx]}>
      <Box key={`face:${seed}`} sx={[FACE_SX, compact && COMPACT_FACE_SX, { pt: `${toastHead(kind)}px` }, moment === 'nat1' && LEAN_SX]}>
        <MeasuredDrawing draw={(w, h) => toastFrame(kind, w, h, moment)} />
        {children}
      </Box>
      {moment === 'nat20' ? (
        <Box key={`garden:${seed}`} sx={GARDEN_SX}>
          <Box sx={GROW_SX}><MeasuredDrawing front draw={(w, h) => toastClimbers(kind, w, h)} /></Box>
          {toastBlooms(kind).map(({ side, shift, up, size }, index) => (
            <Box
              key={index}
              sx={[BLOOM_SX, {
                left: `calc(${side < 0 ? 0 : 100}% + ${shift}px)`, bottom: `${up * 100}%`, width: size, height: size,
                // It opens as its stem reaches it.
                animationDelay: motionTime(Math.round(up * TOAST_MOTION.grow) + TOAST_MOTION.bloomAfter),
              }]}
            >
              <HandDrawnSvg {...toastBloom(kind, index)} />
            </Box>
          ))}
        </Box>
      ) : null}
      {moment === 'nat1' ? (
        <Box sx={GRAVE_SX}>
          <Box key={`hand:${seed}`} sx={[HAND_SX, compact && COMPACT_HAND_SX]}><HandDrawnSvg {...toastHand(kind)} /></Box>
        </Box>
      ) : null}
    </Box>
  );
}
