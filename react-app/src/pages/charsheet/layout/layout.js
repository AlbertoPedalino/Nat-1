export const SHEET_AREAS = {
  saves: 'saves',
  senses: 'senses',
  movement: 'movement',
  profs: 'profs',
  skills: 'skills',
  right: 'right',
  leftCol: 'leftCol',
};

// A cell of the sheet's grid: allowed to shrink below its content. Not
// clipped: a panel filling its cell draws its ink shadow past the cell's edge
// (each panel clips its own content).
export const SHEET_GRID_ITEM_SX = {
  minWidth: 0,
};

export const SHEET_GRID = {
  gridTemplateColumns: { xs: '1fr', md: '200px 210px 1fr' },
  gridTemplateAreas: {
    xs: `
      "${SHEET_AREAS.saves}"
      "${SHEET_AREAS.skills}"
      "${SHEET_AREAS.senses}"
      "${SHEET_AREAS.movement}"
      "${SHEET_AREAS.profs}"
      "${SHEET_AREAS.right}"
    `,
    md: `"${SHEET_AREAS.leftCol} ${SHEET_AREAS.skills} ${SHEET_AREAS.right}"`,
  },
  gap: '0.55rem',
};

// A sheet's responsive value, the phone's when the sheet is embedded: an
// embedded sheet sits in a panel as narrow as a phone, whatever the window
// (the battle map's, the encounter builder's). `responsive` holds the value
// per breakpoint; its `xs` is the phone's, and the embedded sheet's.
export function sheetResponsive(embedded, responsive) {
  return embedded ? responsive.xs : responsive;
}

// The sheet's grid; an embedded sheet takes the phone's (sheetResponsive).
export function sheetGridSx(embedded) {
  return Object.fromEntries(Object.entries(SHEET_GRID).map(([name, value]) => [
    name, value && typeof value === 'object' ? sheetResponsive(embedded, value) : value,
  ]));
}

// The sheet column's side padding on its own page.
export const SHEET_COLUMN_PX = Object.freeze({ xs: '0.6rem', md: '1.1rem' });

// The sheet's column: centred at 1280px on its own page, the full width of the
// panel it sits in when embedded. The header and the panels share it, so they
// line up (the floating dice take the window's corner instead). `embeddedPx`
// is the side padding when embedded.
export function sheetColumnSx(embedded, { embeddedPx = 0 } = {}) {
  return {
    maxWidth: embedded ? 'none' : 1280,
    mx: sheetResponsive(embedded, { xs: 0, md: 'auto' }),
    px: embedded ? embeddedPx : SHEET_COLUMN_PX,
  };
}
