import { FONT_WEIGHTS } from '../../shared/ui/fonts.js';
import { ONE_LINE_SX } from '../../shared/ui/textStyles.js';
import { INK_EDGE } from '../../shared/ui/shadows.js';

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

// The bar of search fields and filters over a part's list (the search, a
// catalog): padded, closed by the ink edge, never squeezed by the list.
export const filterBarSx = {
  p: 1.5,
  borderBottom: INK_EDGE,
  flexShrink: 0,
};

// A pane of a part that scrolls on its own (results, an entry, the shelf).
export const scrollPaneSx = {
  minHeight: 0,
  overflowY: 'auto',
};
