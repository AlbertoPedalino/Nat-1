import { UI_COLORS, uiAlpha } from '../../../shared/ui/colors.js';
import { FONT_SIZES } from '../../../shared/ui/fonts.js';
import { TEXT_STYLES } from '../../../shared/ui/textStyles.js';

export const SHEET_AREAS = {
  saves: 'saves',
  senses: 'senses',
  movement: 'movement',
  profs: 'profs',
  skills: 'skills',
  right: 'right',
  leftCol: 'leftCol',
};

export const SHEET_GRID_ITEM_SX = {
  minWidth: 0,
  overflow: 'hidden',
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

// The sheet's column: centred at 1280px on its own page, the full width of the
// panel it sits in when embedded. The header, the panels and the floating dice
// share it, so they line up. `embeddedPx` is the side padding when embedded.
// The sheet column's side padding on its own page.
export const SHEET_COLUMN_PX = Object.freeze({ xs: '0.6rem', md: '1.1rem' });

export function sheetColumnSx(embedded, { embeddedPx = 0 } = {}) {
  return {
    maxWidth: embedded ? 'none' : 1280,
    mx: embedded ? 0 : { md: 'auto' },
    px: embedded ? embeddedPx : SHEET_COLUMN_PX,
  };
}

// The panel that opens under a sheet row (an action's details, a beast form, a
// created item) and its gold title.
export const detailPanelSx = {
  mt: 0.8,
  p: 1,
  bgcolor: uiAlpha(UI_COLORS.accentText, 0.04),
  border: 1,
  borderColor: 'divider',
  borderRadius: 1,
};

export const detailTitleSx = {
  ...TEXT_STYLES.title,
  fontSize: FONT_SIZES.sm,
  color: UI_COLORS.accentText,
};
