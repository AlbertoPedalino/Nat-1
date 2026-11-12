import { UI_COLORS } from './colors.js';

// The interface's small fantasy ornaments, drawn in the same ink as
// everything else: gilded points (the accent in an ink edge) on the ends of
// a panel's title bar and a gem on a section's rule, as a rulebook sets its
// headings. One recipe, so a restyle reaches every one.
//
// Each is a small picture drawn wholly inside the box that carries it: an
// ornament that pokes out of its box is cut by a frame that hides overflow,
// and inside one that scrolls it grows a scrollbar.

function picture(width, height, path) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">`
    + `<path d="${path}" fill="${UI_COLORS.accent}" stroke="${UI_COLORS.edge}" stroke-width="2" stroke-linejoin="round"/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

// A point 8 wide and 14 tall, its flat side on the bar's edge, pointing in.
const POINT_WIDTH = 8;
const POINT_HEIGHT = 14;
const POINT_IN_FROM_LEFT = picture(POINT_WIDTH, POINT_HEIGHT, `M1 1L${POINT_WIDTH - 1} ${POINT_HEIGHT / 2}L1 ${POINT_HEIGHT - 1}`);
const POINT_IN_FROM_RIGHT = picture(POINT_WIDTH, POINT_HEIGHT, `M${POINT_WIDTH - 1} 1L1 ${POINT_HEIGHT / 2}L${POINT_WIDTH - 1} ${POINT_HEIGHT - 1}`);

function point(side, image) {
  return {
    content: '""',
    position: 'absolute',
    [side]: 0,
    top: 0,
    bottom: 0,
    width: POINT_WIDTH,
    backgroundImage: image,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'center',
    backgroundSize: `${POINT_WIDTH}px ${POINT_HEIGHT}px`,
    pointerEvents: 'none',
  };
}

// The studs on a title bar: a gilded point on each end, set against the
// panel's frame, so the bar reads as a cartouche across the panel.
export const BAR_STUDS_SX = Object.freeze({
  position: 'relative',
  '&::before': point('left', POINT_IN_FROM_LEFT),
  '&::after': point('right', POINT_IN_FROM_RIGHT),
});

// A gem standing in the middle of a heading's rule (spread with the rule
// itself): drawn above the rule, its lower point on the line.
const GEM_SIZE = 10;
const GEM = picture(GEM_SIZE, GEM_SIZE, `M${GEM_SIZE / 2} 1L${GEM_SIZE - 1} ${GEM_SIZE / 2}L${GEM_SIZE / 2} ${GEM_SIZE - 1}L1 ${GEM_SIZE / 2}Z`);

export const RULE_GEM_SX = Object.freeze({
  position: 'relative',
  '&::after': {
    content: '""',
    position: 'absolute',
    left: '50%',
    bottom: 0,
    width: GEM_SIZE,
    height: GEM_SIZE,
    marginLeft: `${-GEM_SIZE / 2}px`,
    backgroundImage: GEM,
    backgroundSize: '100% 100%',
    pointerEvents: 'none',
  },
});
