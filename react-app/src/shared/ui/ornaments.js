import { UI_COLORS } from './colors.js';

// The interface's small fantasy ornaments, drawn in the same ink as
// everything else: gilded gems (the accent in an ink edge) on the ends of
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

// A whole gem, 9 wide and 13 tall, set just inside each end of the bar, in
// the gap before the badge and after the last control.
const STUD_WIDTH = 9;
const STUD_HEIGHT = 13;
const STUD_INSET = 2;
const STUD = picture(STUD_WIDTH, STUD_HEIGHT, `M${STUD_WIDTH / 2} 1L${STUD_WIDTH - 1} ${STUD_HEIGHT / 2}L${STUD_WIDTH / 2} ${STUD_HEIGHT - 1}L1 ${STUD_HEIGHT / 2}Z`);

function stud(side) {
  return {
    content: '""',
    position: 'absolute',
    [side]: STUD_INSET,
    top: 0,
    bottom: 0,
    width: STUD_WIDTH,
    backgroundImage: STUD,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'center',
    backgroundSize: `${STUD_WIDTH}px ${STUD_HEIGHT}px`,
    pointerEvents: 'none',
  };
}

// The studs on a title bar: a gilded gem at each end, so the bar reads as a
// cartouche across the panel.
export const BAR_STUDS_SX = Object.freeze({
  position: 'relative',
  '&::before': stud('left'),
  '&::after': stud('right'),
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
