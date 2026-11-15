// How long the interface's transitions take, in ms of the comic style:
// `fast` for hover and focus, `normal` for things that open, fade or slide,
// `slow` for larger moves. Animations with their own rhythm (dice, map
// effects) keep theirs.
//
// The chosen style sets the pace (shapes.js `motion`, as `--gb-motion-pace`):
// a time is always written through motionTime (an opacity fading in
// motionTime(DURATIONS.fast), never DURATIONS.fast followed by "ms"), so a
// brisker or calmer style (or one with no motion: a pace of 0) reaches every
// transition and animation.
export function motionTime(ms) {
  return `calc(${ms}ms * var(--gb-motion-pace))`;
}

export const DURATIONS = Object.freeze({
  fast: 120,
  normal: 160,
  slow: 220,
});

// The "working" die (BusyDie): one turn.
export const BUSY_MOTION = Object.freeze({ turn: 900 });

// An icon button's icon twitching under the pointer (iconButtonLook).
export const ICON_MOTION = Object.freeze({ twitch: 400 });

// A dialog popping open (the theme's MuiDialog), a little past its size and
// back, as a toast lands.
export const DIALOG_MOTION = Object.freeze({ pop: 260 });

// A hit point bar's lost stretch (SegmentedMeter): held pale for a beat,
// then drained.
export const METER_MOTION = Object.freeze({
  hold: 450,
  drain: 500,
});

// A gem of a counter (GemPip) relit or spent, and the sparkles a relit one
// throws (each one a little after the last).
export const GEM_MOTION = Object.freeze({
  relit: 340,
  spent: 280,
  spark: 520,
  sparkStagger: 40,
});
