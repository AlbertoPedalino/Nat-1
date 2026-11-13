// How long the interface's transitions take, in ms: `fast` for hover and
// focus, `normal` for things that open, fade or slide, `slow` for larger
// moves. Animations with their own rhythm (dice, map effects) keep theirs.
export const DURATIONS = Object.freeze({
  fast: 120,
  normal: 160,
  slow: 220,
});

// A gem of a counter (GemPip) relit or spent, and the sparkles a relit one
// throws (each one a little after the last).
export const GEM_MOTION = Object.freeze({
  relit: 340,
  spent: 280,
  spark: 520,
  sparkStagger: 40,
});
