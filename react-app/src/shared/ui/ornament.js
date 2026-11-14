import { UI_COLORS } from './colors.js';
import { ORNAMENT } from './shapes.js';
import { svgPicture } from './svgPicture.js';

// The ornament (ORNAMENT, shapes.js) drawn once: the accent diamond, inked, as
// a printed rulebook sets a fleuron. Every place it stands takes it from here:
// a card's rule (CardSection), a page's title (PageHeader), a section's title
// (SectionTitle), each item of a rule's list (EntryBlocks).
const ORNAMENT_PICTURE = svgPicture(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-1 -1 ${ORNAMENT.size + 2} ${ORNAMENT.size + 2}">`
  + `<path d="${ORNAMENT.path}" fill="${UI_COLORS.accent}" stroke="${UI_COLORS.edge}" stroke-width="1.5"/></svg>`,
);

// The ornament as a box `size` px across.
export function ornamentSx(size = ORNAMENT.size) {
  return {
    width: size,
    height: size,
    flexShrink: 0,
    backgroundImage: ORNAMENT_PICTURE,
    backgroundSize: '100% 100%',
  };
}

// The ornament set on the middle of the rule along an element's top edge
// (the caller draws the rule: a card's hairline, a page's ink line).
export function ornamentOnRuleSx() {
  const size = ORNAMENT.size + 2;
  return {
    position: 'relative',
    '&::before': {
      ...ornamentSx(size),
      content: '""',
      position: 'absolute',
      top: -size / 2,
      left: '50%',
      transform: 'translateX(-50%)',
      pointerEvents: 'none',
    },
  };
}
