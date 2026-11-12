import { Box } from '@mui/material';
import { LOGO_COLORS, OPACITY, UI_COLORS } from '../../shared/ui/colors.js';
import { UI_FONTS } from '../../shared/ui/fonts.js';
import BubbleDizzy from '../../shared/ui/BubbleDizzy.jsx';
import { focusRingSx } from '../../shared/ui/interactive.js';

// The app's logo on the home cover: the inked, cel-shaded d20 (the same
// drawing as public/favicon.svg). It spins in, all but settled on a 20… and
// flips over onto a 1, the app's name. A click rolls it again, and the
// cover's name with it. Flat on purpose: a 2D drawing that turns, no 3D die.

const INK = UI_COLORS.edge;

const P = {
  Top: [256, 36], UR: [450, 148], LR: [450, 372], Bot: [256, 484], LL: [62, 372], UL: [62, 148],
  T: [256, 140], L: [150, 322], R: [362, 322],
};
const HEX = ['Top', 'UR', 'LR', 'Bot', 'LL', 'UL'];
// Light from the top left: the faces facing it lit, the rest shaded.
const FACES = [
  [['Top', 'UL', 'T'], 'light'],
  [['Top', 'T', 'UR'], 'midLight'],
  [['UL', 'L', 'T'], 'midLight'],
  [['UR', 'T', 'R'], 'midDark'],
  [['UL', 'LL', 'L'], 'mid'],
  [['UR', 'R', 'LR'], 'dark'],
  [['LL', 'Bot', 'L'], 'midDark'],
  [['L', 'Bot', 'R'], 'dark'],
  [['R', 'Bot', 'LR'], 'darkest'],
  [['T', 'L', 'R'], 'mid'],
];
const points = (names) => names.map((name) => P[name].join(',')).join(' ');

// The roll, in one rhythm: a fast spin slowing down with the 20 coming
// upright (0–70%), and just before it settles the die flips over at once
// (70–80%): its left side lifts and falls over its right one — squashed onto
// a pivot right of centre, then unfolding from it, the numerals swapping at
// FLIP — and it lands on the 1 with a bounce and a wobble. Every frame names
// the same transform functions, so the pivot can move between them.
const ROLL_MS = 2400;
const FLIP = '75%';
const AFTER_FLIP = '75.1%';
// When it is down on the 1, as a fraction of the roll; NAT_ONE_LANDED_MS in
// ms, for what waits for the landing (the cover's name).
const LANDED = 0.85;
export const NAT_ONE_LANDED_MS = ROLL_MS * LANDED;

const numeralSx = {
  fontFamily: UI_FONTS.shout,
  fill: LOGO_COLORS.numeral,
  stroke: INK,
  strokeWidth: 12,
  strokeLinejoin: 'round',
  paintOrder: 'stroke fill',
  textAnchor: 'middle',
};

// Driven by the cover (HomePage), which rolls the name with it: `roll` counts
// the rolls (a new one replays the animation from the start), `animate` is
// false for a die at rest on its 1, `onRoll` asks for another roll.
export default function NatOneDie({ roll = 0, animate = true, onRoll, sx }) {
  const still = !animate;
  return (
    <Box
      component="button"
      type="button"
      aria-label="Roll the die"
      onClick={onRoll}
      sx={{ ...buttonSx, ...sx }}
    >
      <Box key={roll} component="svg" viewBox="20 20 472 480" sx={still ? { ...svgSx, ...STILL_SX } : svgSx} aria-hidden="true">
        <g className="die">
          <polygon points={points(HEX)} fill={INK} stroke={INK} strokeWidth={24} strokeLinejoin="round" transform="translate(16 16)" />
          {FACES.map(([face, shade]) => (
            <polygon key={face.join('-')} points={points(face)} fill={LOGO_COLORS[shade]} stroke={INK} strokeWidth={12} strokeLinejoin="round" />
          ))}
          <polygon points={points(HEX)} fill="none" stroke={INK} strokeWidth={24} strokeLinejoin="round" />
          <path d="M 120 150 L 176 112 L 188 128 L 134 168 Z" fill={UI_COLORS.white} opacity={OPACITY.veil} />
          <circle cx={206} cy={98} r={9} fill={UI_COLORS.white} opacity={OPACITY.veil} />
          <text className="twenty" x={256} y={292} fontSize={112} style={numeralSx}>20</text>
          <text className="one" x={258} y={300} fontSize={150} style={numeralSx}>1</text>
        </g>
      </Box>
      {/* Dazed by its own roll: stars circle the die once it lands on the 1. */}
      <Box sx={starsAnchorSx}>
        {still ? null : <BubbleDizzy key={`stars-${roll}`} delay={NAT_ONE_LANDED_MS} reachX={70} reachY={14} starSize={30} />}
      </Box>
    </Box>
  );
}

const buttonSx = {
  position: 'relative',
  display: 'block',
  p: 0,
  border: 0,
  bgcolor: 'transparent',
  cursor: 'pointer',
  // Rounds the focus ring's corners (the button itself draws nothing).
  borderRadius: 2,
  ...focusRingSx(),
};

// The die at rest on its 1, with no roll: after the first roll of the visit,
// and always for reduced motion.
const STILL_SX = {
  '& .die, & .twenty, & .one': { animation: 'none' },
  '& .twenty': { opacity: 0 },
};

// Where the stars circle: just over the die's top point.
const starsAnchorSx = { position: 'absolute', left: 0, right: 0, top: '22%' };

const svgSx = {
  display: 'block',
  width: '100%',
  height: 'auto',
  overflow: 'visible',
  '& .die': {
    transformBox: 'view-box',
    transformOrigin: '256px 260px',
    transform: 'translate(0px, 0px) rotate(-6deg) translateX(0px) scale(1, 1) translateX(0px)',
    animation: `natOneDieRoll ${ROLL_MS}ms both`,
  },
  '& .twenty': { animation: `natOneDieTwenty ${ROLL_MS}ms both` },
  '& .one': { animation: `natOneDieOne ${ROLL_MS}ms both` },
  '@keyframes natOneDieRoll': {
    '0%': { transform: 'translate(0px, -30px) rotate(-900deg) translateX(0px) scale(0.7, 0.7) translateX(0px)', animationTimingFunction: 'cubic-bezier(0.25, 0.6, 0.45, 1)' },
    '62%': { transform: 'translate(0px, 0px) rotate(-34deg) translateX(0px) scale(1, 1) translateX(0px)', animationTimingFunction: 'ease-out' },
    '70%': { transform: 'translate(-80px, 0px) rotate(-10deg) translateX(80px) scale(1, 1) translateX(-80px)', animationTimingFunction: 'ease-in' },
    [FLIP]: { transform: 'translate(-80px, -34px) rotate(8deg) translateX(80px) scale(0.02, 1) translateX(-80px)' },
    [AFTER_FLIP]: { transform: 'translate(80px, -34px) rotate(8deg) translateX(-80px) scale(0.02, 1) translateX(80px)', animationTimingFunction: 'ease-out' },
    '80%': { transform: 'translate(80px, -14px) rotate(18deg) translateX(-80px) scale(1, 1) translateX(80px)', animationTimingFunction: 'ease-in' },
    '85%': { transform: 'translate(30px, 6px) rotate(-10deg) translateX(0px) scale(1.05, 0.93) translateX(0px)' },
    '90%': { transform: 'translate(0px, 0px) rotate(3deg) translateX(0px) scale(1, 1) translateX(0px)' },
    '95%': { transform: 'translate(0px, 0px) rotate(-9deg) translateX(0px) scale(1, 1) translateX(0px)' },
    '100%': { transform: 'translate(0px, 0px) rotate(-6deg) translateX(0px) scale(1, 1) translateX(0px)' },
  },
  '@keyframes natOneDieTwenty': {
    '0%': { opacity: 1 },
    [FLIP]: { opacity: 1 },
    [AFTER_FLIP]: { opacity: 0 },
    '100%': { opacity: 0 },
  },
  '@keyframes natOneDieOne': {
    '0%': { opacity: 0 },
    [FLIP]: { opacity: 0 },
    [AFTER_FLIP]: { opacity: 1 },
    '100%': { opacity: 1 },
  },
  '@media (prefers-reduced-motion: reduce)': STILL_SX,
};
