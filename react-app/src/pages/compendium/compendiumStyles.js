import { FONT_SIZES, FONT_WEIGHTS } from '../../shared/ui/fonts.js';
import { CONTROL_HEIGHTS } from '../../shared/ui/controlHeights.js';
// The looks the compendium's parts share (search, catalogs, books).

// An entry's name on one line, cut with an ellipsis.
export const entryNameSx = {
  fontWeight: FONT_WEIGHTS.bold,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

// A part that fills its pane top to bottom, its list scrolling inside.
export const fillColumnSx = {
  display: 'flex',
  flexDirection: 'column',
  minHeight: 0,
  height: '100%',
};

// The small chip beside a row (a result's kind, a book's id).
export const rowChipSx = { height: CONTROL_HEIGHTS.sm, fontSize: FONT_SIZES.sm, flexShrink: 0 };
