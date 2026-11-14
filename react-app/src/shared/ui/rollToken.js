import { UI_COLORS } from './colors.js';
import { INK_EDGE, inkShadow } from './shadows.js';
import { tintedSurfaceSx } from './surfaces.js';
import { DIE_GLYPH } from './shapes.js';
import { svgPicture } from './svgPicture.js';

// A dice formula in the rules' text ("8d6", "1d4 + 2", read only: EntryBlocks
// through RichText): a small token in the rolls' lime, edged in ink with its
// solid shadow, the die (DIE_GLYPH) before the figures. A stat block's rolls
// are buttons of their own (RollText).
const DIE_PICTURE = svgPicture(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${DIE_GLYPH.size} ${DIE_GLYPH.size}">`
  + `<path d="${DIE_GLYPH.path}" fill="${UI_COLORS.secondary}" stroke="${UI_COLORS.edge}" stroke-width="1"/></svg>`,
);

export const ROLL_TOKEN_SX = Object.freeze({
  ...tintedSurfaceSx(UI_COLORS.secondary),
  display: 'inline-flex',
  alignItems: 'center',
  gap: 0.375,
  color: UI_COLORS.secondaryText,
  border: INK_EDGE,
  borderWidth: 1.5,
  borderRadius: 0.75,
  boxShadow: inkShadow(UI_COLORS.edge, 1),
  px: '0.3rem',
  mx: '0.1rem',
  whiteSpace: 'nowrap',
  '&::before': {
    content: '""',
    width: '0.8em',
    height: '0.8em',
    flexShrink: 0,
    backgroundImage: DIE_PICTURE,
    backgroundSize: '100% 100%',
  },
});
