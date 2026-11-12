import { FONT_WEIGHTS } from '../../shared/ui/fonts.js';
import { ONE_LINE_SX } from '../../shared/ui/textStyles.js';
// The looks the compendium's parts share (search, catalogs, books).

// An entry's name on one line, cut with an ellipsis.
export const entryNameSx = {
  ...ONE_LINE_SX,
  fontWeight: FONT_WEIGHTS.bold,
};

// A part that fills its pane top to bottom, its list scrolling inside.
export const fillColumnSx = {
  display: 'flex',
  flexDirection: 'column',
  minHeight: 0,
  height: '100%',
};
