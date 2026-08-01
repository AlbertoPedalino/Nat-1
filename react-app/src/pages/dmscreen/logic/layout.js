// The board is a 12-column grid of short rows: notes declare a column span and a
// pixel height, and `grid-auto-flow: dense` back-fills the gaps. That is what
// lets one tall note sit on the right while two short ones stack on its left —
// a fixed 2-column layout can only ever produce equal-height rows.
export const BOARD_COLUMNS = 12;
export const ROW_UNIT = 8;
export const GRID_GAP = 12;

// A card covering `n` rows also covers the `n - 1` gaps between them, so the
// usable pixels per row step are ROW_UNIT + GRID_GAP.
export function rowSpanForHeight(height) {
  const usable = Math.max(1, Number(height) || 0) + GRID_GAP;
  return Math.max(1, Math.ceil(usable / (ROW_UNIT + GRID_GAP)));
}

export function columnUnitWidth(boardWidth, columns = BOARD_COLUMNS) {
  const width = Number(boardWidth) || 0;
  if (width <= 0) return 0;
  return (width + GRID_GAP) / columns;
}

export function columnsForWidth(width, unitWidth, columns = BOARD_COLUMNS) {
  if (!unitWidth) return columns;
  const raw = Math.round((Number(width) + GRID_GAP) / unitWidth);
  return Math.min(columns, Math.max(1, raw));
}
