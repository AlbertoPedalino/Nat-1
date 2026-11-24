import { OPACITY, UI_COLORS, colorVariableName } from './colors.js';
import { DURATIONS, STILL_WHEN_REDUCED, motionTime } from './motion.js';
import { BUBBLE, BUBBLE_DECOR_PROPS, BUBBLE_INK_ROLES, BUBBLE_LETTERING, bubbleShadowSx } from './bubbleLooks.js';
import { ROLL_KIND_TONES } from './entityColors.js';

// The speech bubble: every toast, every roll and game notice, every bubble on
// the map is one, drawn as the chosen style draws it (shapes.js `bubble`,
// bubbleLooks.js: its fill and texture, frame, corners, border, tilt, shadow
// and tail). Its shadow falls in the moment's colour (the accent on a natural
// 20, danger on a natural 1, a notice's severity: bubbleToneSx), and where it
// speaks from something it has a tail pointing there (bubbleTailSx).

// The bubble's tilt (the style's), and the larger one of a moment that shouts.
const TILT = 'var(--gb-bubble-tilt)';
export const SHOUT_TILT = `rotate(calc(${TILT} * 2)) scale(1.06)`;

// The colour the bubble's shadow falls in (a palette role), and how far (as
// the ink's 3px): the style's shadow in it.
export function bubbleToneSx(tone, drop = 3) {
  return bubbleShadowSx(tone, drop);
}

// The shadows a bubble wears most (the ink's, every roll kind's colour, every
// notice's), worked out before the first bubble shows: one that first shows
// in a new colour rewrites the page's variables, and the whole page (the
// battle map with it) is restyled.
[UI_COLORS.edge, UI_COLORS.success, UI_COLORS.danger, UI_COLORS.warning, UI_COLORS.infoText, ...Object.values(ROLL_KIND_TONES)]
  .forEach((tone) => bubbleShadowSx(tone));

// The text roles the bubble writes in (a paper bubble's ink), and how its
// inked lettering is lettered on it, set on it.
const INK_SX = {
  ...Object.fromEntries(BUBBLE_INK_ROLES.map((role) => [colorVariableName(role), BUBBLE[`ink:${role}`]])),
  ...BUBBLE_LETTERING,
};

// What is drawn on the bubble (a console's brackets, tape, a hazard stripe).
const DECOR_SX = Object.freeze({
  '&::after': { position: 'absolute', pointerEvents: 'none', ...Object.fromEntries(BUBBLE_DECOR_PROPS.map((prop) => [prop, BUBBLE[`decor:${prop}`]])) },
});

// The bubble itself; `tone` colours its shadow. It sits as the style tilts it
// and, with `pop`, snaps in like a speech balloon drawn in.
export function bubbleSx({ tone = UI_COLORS.edge, pop = true } = {}) {
  return {
    ...bubbleToneSx(tone),
    '--gb-bubble-tilt': BUBBLE.tilt,
    background: BUBBLE.background,
    backgroundClip: BUBBLE.backgroundClip,
    border: BUBBLE.border,
    borderImage: BUBBLE.borderImage,
    borderRadius: BUBBLE.radius,
    outline: BUBBLE.outline,
    outlineOffset: BUBBLE.outlineOffset,
    color: UI_COLORS.textPrimary,
    ...INK_SX,
    ...DECOR_SX,
    transform: `rotate(${TILT})`,
    ...(pop ? {
      animation: `gbBubblePop ${motionTime(DURATIONS.slow)} cubic-bezier(0.34, 1.56, 0.64, 1)`,
      '@keyframes gbBubblePop': {
        from: { opacity: 0, transform: 'rotate(-4deg) scale(0.7)' },
        to: { opacity: 1, transform: `rotate(${TILT}) scale(1)` },
      },
      ...STILL_WHEN_REDUCED,
    } : null),
  };
}

// The tail, only where the bubble speaks from something (a piece on the map,
// a hex, the dice dock a roll comes from): the style's, drawn by the bubble's
// own ::before on its `side` ('top' or 'bottom') at `at` along it, over the
// bubble's edge so it joins it. The bubble must be positioned.
export function bubbleTailSx({ side = 'bottom', at = '50%' } = {}) {
  return {
    '&::before': {
      content: '""',
      position: 'absolute',
      left: at,
      [side]: `calc(-1 * ${BUBBLE.tailReach})`,
      width: BUBBLE.tailWidth,
      height: BUBBLE.tailHeight,
      transform: side === 'top' ? 'translateX(-50%) scaleY(-1)' : 'translateX(-50%)',
      backgroundImage: BUBBLE.tail,
      backgroundSize: '100% 100%',
      pointerEvents: 'none',
    },
  };
}

// A bubble spoken by something on the map (a piece's roll, the hex the party
// stands on): it grows out of its tail, which sits on the speaker, so it reads
// as said by it rather than dropped onto the map from off screen.
export const BUBBLE_FROM_TAIL_SX = Object.freeze({
  transformOrigin: 'bottom center',
  animation: `gbBubbleFromTail ${motionTime(DURATIONS.slow)} cubic-bezier(0.34, 1.4, 0.64, 1)`,
  '@keyframes gbBubbleFromTail': {
    from: { opacity: 0, transform: 'scale(0.25)' },
    to: { opacity: 1, transform: 'scale(1)' },
  },
  ...STILL_WHEN_REDUCED,
});

// Where a moving bubble comes to rest: a variable its motion's frames end on,
// so each motion is one set of frames whatever the bubble rests at (the dice
// toast's shouting tilt, the map bubble's own, the home cover's title).
const REST = 'var(--gb-bubble-rest)';
const restingAt = (rest) => ({ '--gb-bubble-rest': rest, transform: rest });

// A motion: `frames` played once over `ms` (paced by the style), settling at
// `rest`; `both` holds its first frame while it waits and its last after.
function motionSx(name, rest, ms, easing, frames, { both = false, origin = null } = {}) {
  return {
    ...restingAt(rest),
    ...(origin ? { transformOrigin: origin } : null),
    animation: `${name} ${motionTime(ms)} ${easing}${both ? ' both' : ''}`,
    [`@keyframes ${name}`]: frames,
    ...STILL_WHEN_REDUCED,
  };
}

// A bubble that cheers (a natural 20): it leaps up stretched, lands squashed
// like a spring, rocks twice and settles at `end` — the larger shouting tilt
// on the dice toast, the bubble's own tilt over a token. With `delay` (ms) it
// is not there until it leaps in (the home cover's name, after the die lands).
export function bubbleCheerSx(end = SHOUT_TILT, { delay = 0 } = {}) {
  const cheer = `gbBubbleCheer ${motionTime(DURATIONS.slow * 4)} cubic-bezier(0.3, 0.9, 0.4, 1)`;
  return {
    ...restingAt(end),
    animation: delay ? `${cheer} ${delay}ms both, gbBubbleWait 1ms linear ${delay}ms both` : cheer,
    '@keyframes gbBubbleWait': { from: { opacity: 0 }, to: { opacity: 1 } },
    '@keyframes gbBubbleCheer': {
      // No fade: the bubble is there from the first frame, only small.
      '0%': { transform: 'translateY(12px) scale(0.6) rotate(-6deg)' },
      '22%': { transform: 'translateY(-18px) scale(0.94, 1.14) rotate(3deg)' },
      '40%': { transform: 'translateY(2px) scale(1.14, 0.88) rotate(-3deg)' },
      '56%': { transform: 'translateY(-6px) scale(0.98, 1.05) rotate(2.5deg)' },
      '72%': { transform: 'translateY(0) scale(1.04, 0.97) rotate(-2deg)' },
      '86%': { transform: 'rotate(1deg)' },
      '100%': { transform: REST },
    },
    ...STILL_WHEN_REDUCED,
  };
}

// The bubble's own resting tilt, for a cheer that settles back into it.
export const BUBBLE_REST = `rotate(${TILT})`;

// A bubble that groans (a natural 1): it shakes once instead of popping in.
function bubbleGroanSx(rest = BUBBLE_REST) {
  return motionSx('gbBubbleShake', rest, DURATIONS.slow * 2, 'ease-in-out', {
    '0%, 100%': { transform: REST },
    '20%': { transform: 'rotate(-3deg) translateX(-6px)' },
    '40%': { transform: 'rotate(2deg) translateX(5px)' },
    '60%': { transform: 'rotate(-2deg) translateX(-4px)' },
    '80%': { transform: 'rotate(1deg) translateX(2px)' },
  });
}

// How a roll's bubble moves on a natural 20 or 1, by the style's moment's
// `motion` (shapes.js moments, rollMoment.js): its sx, given where the bubble
// `rest`s. Each is one set of frames, named once.
export const BUBBLE_MOTIONS = Object.freeze({
  // The comic's: a spring, a shake.
  cheer: (rest) => bubbleCheerSx(rest),
  groan: (rest) => bubbleGroanSx(rest),
  // Rising out of the dark like a candle catching.
  loom: (rest) => motionSx('gbMomentLoom', rest, 1600, 'cubic-bezier(.2,.7,.2,1)', {
    '0%': { opacity: 0, transform: 'translateY(34px) scale(.82)', filter: 'brightness(.3)' },
    '30%': { opacity: OPACITY.heavy, filter: 'brightness(1.6)' },
    '36%': { filter: 'brightness(.6)' },
    '44%': { filter: 'brightness(1.4)' },
    '70%': { transform: 'translateY(-4px) scale(1.08)', filter: 'brightness(1)' },
    '100%': { opacity: 1, transform: REST },
  }, { both: true }),
  // Fainting to one side, and coming round.
  faint: (rest) => motionSx('gbMomentFaint', rest, 1500, 'ease-in-out', {
    '0%, 100%': { transform: REST },
    '30%': { transform: 'rotate(-11deg) translateY(10px)' },
    '55%': { transform: 'rotate(-7deg) translateY(6px)' },
    '80%': { transform: 'rotate(-2deg) translateY(1px)' },
  }, { origin: '20% 100%' }),
  // A hologram drawn line by line, flickering in.
  materialize: (rest) => motionSx('gbMomentMaterialize', rest, 1100, 'steps(14)', {
    '0%': { transform: 'scale(1, .02)', opacity: OPACITY.edge },
    '40%': { transform: 'scale(1, 1.12)', opacity: OPACITY.heavy },
    '50%': { opacity: OPACITY.shade },
    '60%': { opacity: 1, transform: 'scale(1)' },
    '70%': { opacity: OPACITY.strong },
    '100%': { opacity: 1, transform: REST },
  }, { both: true }),
  // A corrupted signal: jumps, skews and wrong colours.
  glitch: (rest) => motionSx('gbMomentGlitch', rest, 900, 'steps(1)', {
    '0%, 46%, 70%, 100%': { transform: REST, filter: 'none' },
    '10%': { transform: 'translate(-7px, 2px) skewX(14deg)', filter: 'hue-rotate(90deg)' },
    '22%': { transform: 'translate(6px, -2px) skewX(-8deg)' },
    '34%': { transform: 'translate(-3px, 0) scale(1, .94)', filter: 'hue-rotate(-60deg) saturate(2)' },
    '58%': { transform: 'translate(8px, 1px) skewX(10deg)', filter: 'invert(.2)' },
  }),
  // Slammed down like a rubber stamp.
  stamp: (rest) => motionSx('gbMomentStamp', rest, 700, 'cubic-bezier(.6,0,.9,.4)', {
    '0%': { opacity: 0, transform: 'scale(1.9) rotate(-9deg)' },
    '55%': { opacity: 1, transform: 'scale(.9) rotate(-1deg)' },
    '70%': { transform: 'scale(1.1) rotate(-2deg)' },
    '100%': { transform: REST },
  }, { both: true }),
  // A shell's blast: a heavy quake, the eyes blurring.
  quake: (rest) => motionSx('gbMomentQuake', rest, 1000, 'linear', {
    '0%, 100%': { transform: REST, filter: 'none' },
    '8%': { transform: 'translate(-9px, 4px) rotate(-4deg)', filter: 'blur(1.5px)' },
    '16%': { transform: 'translate(8px, -5px) rotate(3deg)' },
    '24%': { transform: 'translate(-7px, 3px) rotate(-3deg)', filter: 'blur(1px)' },
    '32%': { transform: 'translate(6px, -2px) rotate(2deg)' },
    '44%': { transform: 'translate(-4px, 2px) rotate(-2deg)', filter: 'none' },
    '56%': { transform: 'translate(3px, -1px)' },
  }),
  // Rising and lighting up like a star.
  ascend: (rest) => motionSx('gbMomentAscend', rest, 2000, 'ease-in-out', {
    '0%': { opacity: 0, transform: 'translateY(26px) scale(.9)', filter: 'brightness(.6)' },
    '40%': { opacity: 1, transform: 'translateY(-10px) scale(1.06)', filter: 'brightness(1.3)' },
    '70%': { transform: 'translateY(-4px) scale(1.06)', filter: 'brightness(1.1)' },
    '100%': { transform: REST, filter: 'none' },
  }, { both: true }),
  // Darkened by an eclipse, and slowly lit again.
  eclipse: (rest) => motionSx('gbMomentEclipse', rest, 1800, 'ease-in-out', {
    '0%, 100%': { filter: 'brightness(1)', transform: REST },
    '35%': { filter: 'brightness(.25) saturate(.3)', transform: 'translateY(8px)' },
    '60%': { filter: 'brightness(.4)' },
  }),
  // Bobbing on the waves.
  bob: (rest) => motionSx('gbMomentBob', rest, 2200, 'ease-in-out', {
    '0%': { opacity: 0, transform: 'translateY(20px) rotate(6deg) scale(.9)' },
    '18%': { opacity: 1, transform: 'translateY(-6px) rotate(-5deg)' },
    '38%': { transform: 'translateY(3px) rotate(4deg)' },
    '58%': { transform: 'translateY(-3px) rotate(-3deg)' },
    '78%': { transform: 'translateY(1px) rotate(1.5deg)' },
    '100%': { transform: REST },
  }, { both: true, origin: '50% 120%' }),
  // Heeling over, and righting itself.
  capsize: (rest) => motionSx('gbMomentCapsize', rest, 1900, 'cubic-bezier(.4,0,.3,1)', {
    '0%, 100%': { transform: REST },
    '28%': { transform: 'rotate(-24deg) translateY(6px)' },
    '48%': { transform: 'rotate(9deg)' },
    '66%': { transform: 'rotate(-6deg)' },
    '84%': { transform: 'rotate(2deg)' },
  }, { origin: '50% 110%' }),
  // Wound up click by click, then sprung.
  windup: (rest) => motionSx('gbMomentWindup', rest, 1400, 'linear', {
    '0%': { transform: 'rotate(-14deg) scale(.86)' },
    '12%': { transform: 'rotate(-9deg) scale(.86)' },
    '24%': { transform: 'rotate(-4deg) scale(.86)' },
    '36%': { transform: 'rotate(1deg) scale(.86)' },
    '48%, 62%': { transform: 'rotate(6deg) scale(.86)' },
    '80%': { transform: 'rotate(-4deg) scale(1.16)' },
    '100%': { transform: REST },
  }, { both: true }),
  // A machine coughing, jamming and sagging.
  sputter: (rest) => motionSx('gbMomentSputter', rest, 1500, 'steps(1)', {
    '0%, 14%, 36%, 100%': { transform: REST },
    '8%': { transform: 'translateX(-4px) rotate(-3deg)' },
    '22%': { transform: 'translateX(5px) rotate(1deg)' },
    '48%': { transform: 'translateY(4px) rotate(-6deg)' },
    '70%': { transform: 'translateY(5px) rotate(-7deg)' },
    '86%': { transform: 'translateY(2px) rotate(-3deg)' },
  }),
  // Struck down like a hammer on the anvil, squashed, rebounding.
  hammer: (rest) => motionSx('gbMomentHammer', rest, 1000, 'cubic-bezier(.7,0,1,.6)', {
    '0%': { opacity: 0, transform: 'translateY(-70px)' },
    '40%': { opacity: 1, transform: 'translateY(0)' },
    '48%': { transform: 'translateY(4px) scale(1.24, .8)' },
    '60%': { transform: 'translateY(-10px) scale(.98, 1.1)' },
    '74%': { transform: 'translateY(0) scale(1.1, .96)' },
    '100%': { transform: REST },
  }, { both: true }),
  // Cracking, then giving way.
  crumble: (rest) => motionSx('gbMomentCrumble', rest, 1400, 'ease-in', {
    '0%, 100%': { transform: REST },
    '10%': { transform: 'translateX(-3px) rotate(-2.5deg)' },
    '20%': { transform: 'translateX(3px) rotate(-.6deg)' },
    '30%': { transform: 'translateX(-2px) rotate(-2deg)' },
    '55%': { transform: 'translateY(12px) rotate(-5deg) scale(1.02, .96)' },
    '75%': { transform: 'translateY(9px) rotate(-4deg) scale(1.03, .97)' },
  }),
  // Opening like a flower.
  bloom: (rest) => motionSx('gbMomentBloom', rest, 1400, 'cubic-bezier(.3,1.4,.5,1)', {
    '0%': { opacity: 0, transform: 'scale(.1) rotate(-50deg)' },
    '50%': { opacity: 1, transform: 'scale(1.14) rotate(6deg)' },
    '72%': { transform: 'scale(1) rotate(-3deg)' },
    '100%': { transform: REST },
  }, { both: true }),
  // Wilting, its colour draining, and lifting again.
  wilt: (rest) => motionSx('gbMomentWilt', rest, 1900, 'ease-in-out', {
    '0%, 100%': { transform: REST, filter: 'none' },
    '40%': { transform: 'rotate(-8deg) skewX(6deg) scale(1.03, .94) translateY(6px)', filter: 'saturate(.4)' },
    '70%': { transform: 'rotate(-6deg) skewX(4deg) scale(1.04, .97) translateY(4px)', filter: 'saturate(.6)' },
  }, { origin: '50% 100%' }),
  // Throbbing like a heart.
  throb: (rest) => motionSx('gbMomentThrob', rest, 1600, 'ease-in-out', {
    '0%': { opacity: 0, transform: 'scale(.7)' },
    '18%': { opacity: 1, transform: 'scale(1.14)' },
    '28%': { transform: 'scale(1)' },
    '38%': { transform: 'scale(1.12)' },
    '52%': { transform: 'scale(1.02)' },
    '64%': { transform: 'scale(1.09)' },
    '80%': { transform: 'scale(1.03)' },
    '100%': { transform: REST },
  }, { both: true }),
  // Sinking under water, swaying, darkening, and rising again.
  drown: (rest) => motionSx('gbMomentDrown', rest, 2200, 'ease-in-out', {
    '0%, 100%': { transform: REST, filter: 'none' },
    '20%': { transform: 'translateY(8px) skewX(5deg) rotate(-3deg)', filter: 'brightness(.8)' },
    '40%': { transform: 'translateY(16px) skewX(-5deg) rotate(1deg)', filter: 'brightness(.6)' },
    '60%': { transform: 'translateY(18px) skewX(4deg) rotate(-2deg)' },
    '80%': { transform: 'translateY(8px) skewX(-2deg)', filter: 'brightness(.9)' },
  }),
  // A sprite's jump, in steps.
  jump: (rest) => motionSx('gbMomentJump', rest, 1200, 'steps(1)', {
    '0%': { transform: 'translateY(16px)' },
    '10%, 50%, 70%': { transform: 'translateY(0)' },
    '20%, 40%': { transform: 'translateY(-16px)' },
    '30%': { transform: 'translateY(-24px)' },
    '60%': { transform: 'translateY(-10px)' },
    '100%': { transform: REST },
  }),
  // GAME OVER: blinking, dropping a row at a time.
  gameover: (rest) => motionSx('gbMomentGameOver', rest, 1600, 'steps(1)', {
    '0%, 100%': { opacity: 1, transform: REST },
    '10%, 30%, 50%': { opacity: 0 },
    '20%, 40%, 60%': { opacity: 1, transform: 'translateY(4px)' },
    '70%': { transform: 'translateY(8px)' },
    '85%': { transform: 'translateY(4px)' },
  }),
  // Sliced in by a glitch, its colours split.
  glitchin: (rest) => motionSx('gbMomentGlitchIn', rest, 900, 'steps(1)', {
    '0%': { opacity: 0, clipPath: 'inset(0 0 100% 0)' },
    '12%': { opacity: 1, clipPath: 'inset(0 0 60% 0)', transform: 'translateX(-12px) skewX(-12deg)', filter: 'hue-rotate(60deg) saturate(2)' },
    '26%': { clipPath: 'inset(30% 0 20% 0)', transform: 'translateX(10px)' },
    '40%': { clipPath: 'inset(0 0 0 0)', transform: 'translateX(-4px) skewX(6deg)' },
    '54%': { transform: 'translateX(3px)', filter: 'hue-rotate(-40deg)' },
    '68%, 100%': { opacity: 1, clipPath: 'none', transform: REST, filter: 'none' },
  }, { both: true }),
  // A short circuit: off, on, flaring.
  short: (rest) => motionSx('gbMomentShort', rest, 1300, 'steps(1)', {
    '0%, 44%, 100%': { filter: 'none', transform: REST },
    '8%': { filter: 'brightness(2.4)', transform: 'translateX(-3px)' },
    '14%, 52%': { filter: 'brightness(.1)' },
    '22%': { filter: 'brightness(1.8) contrast(1.6)', transform: 'translateX(3px)' },
    '30%': { filter: 'brightness(.2)' },
    '58%': { filter: 'brightness(1.5)', transform: 'translate(2px, 3px) rotate(-3deg)' },
    '70%': { filter: 'brightness(.6)' },
  }),
});
