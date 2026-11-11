import { UI_COLORS } from './colors.js';

// The comic speech bubble: every toast and roll bubble is one. A thick ink
// edge, a solid offset shadow — in ink, or in the moment's colour (the accent
// on a natural 20, danger on a natural 1, a notice's severity) — and a tail
// pointing where it speaks from.

// The bubble's solid shadow, set off to the lower right.
export function comicShadow(color = UI_COLORS.edge) {
  return `4px 4px 0 ${color}`;
}

// The bubble itself, filled with `fill`; `tone` colours its shadow.
export function bubbleSx({ fill = UI_COLORS.surfaceRaised, tone = UI_COLORS.edge } = {}) {
  return {
    bgcolor: fill,
    border: `3px solid ${UI_COLORS.edge}`,
    borderRadius: 2,
    boxShadow: comicShadow(tone),
  };
}

// The tail, drawn by the bubble's own ::before (the ink) and ::after (the
// fill over it), on its `side` ('top' or 'bottom') at `at` along it. The
// bubble must be positioned (relative, fixed or absolute).
export function bubbleTailSx({ fill = UI_COLORS.surfaceRaised, side = 'bottom', at = '50%' } = {}) {
  const point = side === 'top' ? 'borderBottom' : 'borderTop';
  const piece = (width, height, offset, color) => ({
    content: '""',
    position: 'absolute',
    left: at,
    [side]: -offset,
    transform: 'translateX(-50%)',
    width: 0,
    height: 0,
    borderLeft: `${width}px solid transparent`,
    borderRight: `${width}px solid transparent`,
    [point]: `${height}px solid ${color}`,
    pointerEvents: 'none',
  });
  return {
    '&::before': piece(11, 15, 15, UI_COLORS.edge),
    '&::after': piece(7, 10, 10, fill),
  };
}
