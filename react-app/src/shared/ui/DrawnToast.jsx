import { useRef } from 'react';
import { Box, Typography } from '@mui/material';
import { OPACITY, UI_COLORS } from './colors.js';
import { FONT_SIZES, LETTER_SPACINGS, LINE_HEIGHTS } from './fonts.js';
import { TEXT_STYLES } from './textStyles.js';
import { BUBBLE_INK_SX } from './bubble.js';
import { bubbleTone } from './bubbleLooks.js';
import { useStyleShapes } from './themeIds.js';
import { parentOf, useElementSize } from './useElementSize.js';
import { GONE_WHEN_REDUCED, STILL_WHEN_REDUCED, TOAST_MOTION, motionTime } from './motion.js';
import { TOAST_HAND_BOX, drawsToast, toastBloom, toastBlooms, toastClimbers, toastFrame, toastHand, toastHead, toastLook, toastMarks, toastMasthead, toastStamp, toastStampFrame } from './toastDrawing.js';
import MeasuredDrawing from './MeasuredDrawing.jsx';
import HandDrawnSvg from './HandDrawnSvg.jsx';

// A roll shown on what the style draws in place of its bubble (shapes.js
// rollToast.drawing, toastDrawing.js: the gothic's tombstone, the noir's
// newspaper, the war's telegram): the drawn thing to the size of what the roll says (`children`),
// centred on it, and the roll's `moment` its own way (how it arrives, what
// grows and claws, what is marked on it, a flash). The sheet's toast
// (DiceToast) and the bubble over a piece on the map (RollBubble) are both
// this, so the roller and the table see one thing; `compact` is the smaller
// of the two, over a piece. Where it stands is its caller's (`sx`); `seed` names the throw, so a
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
// Opening from nothing, a little past its size and back: a flower, a hole.
const opening = (ms) => ({
  animation: `gbToastBloom ${motionTime(ms)} both cubic-bezier(.3, 1.7, .5, 1)`,
  '@keyframes gbToastBloom': { from: { transform: 'scale(0)' }, to: { transform: 'scale(1)' } },
  ...STILL_WHEN_REDUCED,
});
const BLOOM_SX = { position: 'absolute', translate: '-50% 50%', ...opening(TOAST_MOTION.bloom) };

// What a drawing marks on its toast at a moment (toastDrawing.js toastMarks):
// each mark over the toast, to its size, opening about the point it is made
// at, coming up out of nothing, or going off twice and gone (a flashbulb:
// never there for whoever asked for less motion), on its beat.
const MARKS_SX = { position: 'absolute', inset: 0, pointerEvents: 'none' };
const MARK_MOTIONS = {
  pop: opening(TOAST_MOTION.mark),
  fade: {
    animation: `gbToastFade ${motionTime(TOAST_MOTION.mark * 2)} both`,
    '@keyframes gbToastFade': { from: { opacity: 0 }, to: { opacity: 1 } },
    ...STILL_WHEN_REDUCED,
  },
  bulb: {
    animation: `gbToastBulb ${motionTime(TOAST_MOTION.bulb)} 2 both`,
    '@keyframes gbToastBulb': {
      '0%': { opacity: 0, transform: 'scale(.2)' },
      '12%': { opacity: 1, transform: 'scale(1.15)' },
      '35%': { opacity: OPACITY.veil, transform: 'scale(1)' },
      '100%': { opacity: 0, transform: 'scale(.7)' },
    },
    ...GONE_WHEN_REDUCED,
  },
  // Hung, and swinging to rest about the point it hangs from.
  swing: {
    animation: `gbToastSwing ${motionTime(TOAST_MOTION.swing)} both ease-out`,
    '@keyframes gbToastSwing': {
      '0%': { opacity: 0, transform: 'rotate(-38deg)' },
      '30%': { opacity: 1, transform: 'rotate(16deg)' },
      '55%': { transform: 'rotate(-9deg)' },
      '80%': { transform: 'rotate(4deg)' },
      '100%': { transform: 'none' },
    },
    ...STILL_WHEN_REDUCED,
  },
};

// What a drawing has stamped across its toast at a moment (toastDrawing.js
// toastStamp): its words in the stamp's ink, askew in a frame the drawing
// draws to their size, brought down once the moment has played; smaller on a
// compact toast.
const STAMP_SX = {
  position: 'absolute', right: 12, bottom: 26, zIndex: 3, isolation: 'isolate', px: 1, pt: 0.5, pb: 0.25, rotate: '-12deg', pointerEvents: 'none',
  ...opening(TOAST_MOTION.mark),
  animationDelay: motionTime(TOAST_MOTION.beat * 6),
};
const COMPACT_STAMP_SX = { scale: '0.75', transformOrigin: '100% 100%' };
const STAMP_WORDS_SX = { ...TEXT_STYLES.printed, fontSize: FONT_SIZES.sm, lineHeight: LINE_HEIGHTS.none, color: UI_COLORS.dangerDeep, maxWidth: '6.5em' };

// Where a toast places what its drawing is laid by (toastDrawing.js places):
// the top of its dice, the middle and the foot of its total, the foot of its
// masthead, and how wide the dice or the total's figure stand, px in the
// toast, read off what the toast says (each marked `data-roll-part`): read
// when the face is laid out (useElementSize `read`), never while it is drawn.
function placesOf(face) {
  const part = (name) => face?.querySelector(`[data-roll-part="${name}"]`);
  const [dice, total, masthead] = [part('dice'), part('total'), part('masthead')];
  const foot = (node) => (node ? node.offsetTop + node.offsetHeight : undefined);
  const wide = Math.max(dice?.offsetWidth ?? 0, total?.firstElementChild?.offsetWidth ?? 0) || undefined;
  return [dice?.offsetTop, total ? total.offsetTop + total.offsetHeight / 2 : undefined, foot(total), foot(masthead), wide];
}

// What a drawing prints over everything the toast says (toastDrawing.js
// toastMasthead: a paper's name): a sign across its head, spaced out, with
// room under it for the rules the drawing lays there.
const MASTHEAD_SX = {
  ...TEXT_STYLES.heading, fontSize: FONT_SIZES.title, lineHeight: LINE_HEIGHTS.none, letterSpacing: LETTER_SPACINGS.xxl, color: UI_COLORS.textPrimary, mt: 0.25, mb: 1.75,
};
const COMPACT_MASTHEAD_SX = { fontSize: FONT_SIZES.xxl };

// How a toast arrives at a moment (its look's `arrive`): spinning in from
// nothing, as a headline does in an old film; or slapped down on the table,
// dropped from close up and left a little askew. One that is hit then jolts
// three times, as each round goes through it, back to where it landed
// (`LANDED`: where each arrival leaves the toast).
const LANDED = { spin: 'none', slap: 'rotate(2deg)' };
const ARRIVALS = {
  spin: {
    animation: `gbToastSpin ${motionTime(TOAST_MOTION.spin)} both cubic-bezier(.2, .8, .3, 1)`,
    '@keyframes gbToastSpin': { from: { transform: 'rotate(-720deg) scale(.05)', opacity: 0 } },
  },
  slap: {
    animation: `gbToastSlap ${motionTime(TOAST_MOTION.slap)} both cubic-bezier(.6, 0, .9, .5)`,
    '@keyframes gbToastSlap': {
      '0%': { transform: 'scale(1.8) rotate(-10deg)', opacity: 0 },
      '25%': { opacity: 1 },
      '62%': { transform: 'scale(.95) rotate(3deg)' },
      '80%': { transform: `scale(1.03) ${LANDED.slap}` },
      '100%': { transform: LANDED.slap },
    },
  },
};
function arrivalSx(arrive, jolts) {
  const { animation, ...frames } = ARRIVALS[arrive];
  // The jolt has no fill: until it starts, and once it is over, the arrival's own end holds.
  const jolt = `gbToastJolt-${arrive} ${motionTime(TOAST_MOTION.jolt)} ${motionTime(TOAST_MOTION.joltAfter)}`;
  return {
    transformOrigin: '50% 50%',
    // Painted once and moved as it is: a page shaken while its marks open on
    // it was painted again, blurred shadows and all, on every frame.
    willChange: 'transform',
    animation: jolts ? `${animation}, ${jolt}` : animation,
    ...frames,
    ...(jolts ? {
      [`@keyframes gbToastJolt-${arrive}`]: {
        '0%, 12%, 35%, 58%, 100%': { transform: LANDED[arrive] },
        '4%': { transform: `${LANDED[arrive]} translate(-5px, 3px) rotate(-1.5deg)` },
        '27%': { transform: `${LANDED[arrive]} translate(5px, -2px) rotate(1.2deg)` },
        '50%': { transform: `${LANDED[arrive]} translate(-3px, 4px) rotate(-1deg)` },
      },
    } : null),
    ...STILL_WHEN_REDUCED,
  };
}
const ARRIVAL_SX = Object.freeze(Object.fromEntries(Object.keys(ARRIVALS).flatMap((arrive) => [[arrive, arrivalSx(arrive, false)], [`${arrive}:hit`, arrivalSx(arrive, true)]])));

// A flash going off before the toast (a natural 20 on one whose `look`
// flashes): white out and gone; never there for whoever asked for less motion.
const FLASH_SX = {
  position: 'absolute',
  inset: -30,
  zIndex: 4,
  pointerEvents: 'none',
  opacity: 0,
  background: `radial-gradient(circle at 50% 40%, ${UI_COLORS.white} 0, transparent 68%)`,
  animation: `gbToastFlash ${motionTime(TOAST_MOTION.flash)}`,
  '@keyframes gbToastFlash': { '0%': { opacity: 0 }, '12%': { opacity: 1 }, '100%': { opacity: 0 } },
  ...GONE_WHEN_REDUCED,
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
  // A drawn toast that is the style's paper takes a colour as its bubble does.
  return { kind, drawn, written: drawn && !toastLook(kind).paper ? asIs : bubbleTone };
}

// The colour a roll's total is written in on a toast drawn as `kind`
// (`layout`: rollToastLayout.js): the drawing's gold at a natural 20, plain at
// a natural 1, the roll's own otherwise, as the drawing takes a colour.
export function drawnTotalColor(layout, kind) {
  const { gold, paper } = toastLook(kind);
  if (layout.isCrit) return UI_COLORS[gold];
  if (layout.isFail) return UI_COLORS.textPrimary;
  // On paper a roll of no kind is written in the paper's ink, a kind's colour as the bubble takes it.
  if (paper) return layout.tone ? bubbleTone(layout.totalColor) : UI_COLORS.textPrimary;
  return layout.totalColor;
}

function DrawnMarks({ kind, moment }) {
  const ref = useRef(null);
  const face = useElementSize(ref, parentOf, placesOf);
  const marks = face?.width > 0 ? toastMarks(kind, face.width, face.height, moment, face.read) : [];
  return (
    <Box ref={ref} sx={MARKS_SX}>
      {marks.map(({ pieces, box: seen, at: [x, y], beat, motion }, index) => (
        <Box key={index} sx={[MARKS_SX, MARK_MOTIONS[motion], { transformOrigin: `${x}px ${y}px`, animationDelay: motionTime(beat * TOAST_MOTION.beat) }]}>
          <HandDrawnSvg pieces={pieces} box={seen} />
        </Box>
      ))}
    </Box>
  );
}

export default function DrawnToast({ kind, moment, seed, compact = false, sx, children, ...root }) {
  const { paper, lean, flash, arrive, jolts, tilt, mastRoom, footRoom } = toastLook(kind);
  const arrival = arrive?.[moment];
  const hand = moment === 'nat1' ? toastHand(kind) : null;
  const masthead = toastMasthead(kind);
  const stamp = toastStamp(kind, moment);
  return (
    <Box {...root} sx={[ROOT_SX, sx]}>
      <Box
        key={`face:${seed}`}
        sx={[FACE_SX, paper && BUBBLE_INK_SX, compact && COMPACT_FACE_SX, { pt: `${toastHead(kind)}px` }, footRoom ? { pb: `${footRoom}px` } : null, tilt ? { rotate: `${tilt}deg` } : null,
          moment === 'nat1' && lean && LEAN_SX, arrival && ARRIVAL_SX[moment === 'nat1' && jolts ? `${arrival}:hit` : arrival]]}
      >
        <MeasuredDrawing read={placesOf} draw={(w, h, places) => toastFrame(kind, w, h, moment, places)} />
        {masthead ? <Typography data-roll-part="masthead" sx={[MASTHEAD_SX, compact && COMPACT_MASTHEAD_SX, mastRoom ? { mb: `${mastRoom}px` } : null]}>{masthead}</Typography> : null}
        {children}
        <DrawnMarks kind={kind} moment={moment} />
        {stamp ? (
          <Box sx={[STAMP_SX, compact && COMPACT_STAMP_SX]}>
            <MeasuredDrawing draw={(w, h) => toastStampFrame(kind, w, h)} />
            <Typography sx={STAMP_WORDS_SX}>{stamp}</Typography>
          </Box>
        ) : null}
      </Box>
      {moment === 'nat20' && flash ? <Box key={`flash:${seed}`} sx={FLASH_SX} /> : null}
      {moment === 'nat20' && toastBlooms(kind).length ? (
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
      {hand ? (
        <Box sx={GRAVE_SX}>
          <Box key={`hand:${seed}`} sx={[HAND_SX, compact && COMPACT_HAND_SX]}><HandDrawnSvg {...hand} /></Box>
        </Box>
      ) : null}
    </Box>
  );
}
