import { SURFACES } from './surfaces.js';
import { INK_EDGE } from './shadows.js';
import { UI_COLORS, panelScreentone } from './colors.js';
import { TEXT_STYLES } from './textStyles.js';
import { ornamentSx } from './ornament.js';

// How the rules' text is set, wherever it is drawn (EntryBlocks for a
// spell, a feature, the compendium; EntryRenderer for a stat block): one look
// for a list, a boxed text and a table, so the two renderers read as one book.

// A list: each item led by the ornament's diamond (ornament.js), as a section
// title and a card's rule are.
export const RULE_LIST_SX = Object.freeze({
  m: 0,
  pl: 2.25,
  listStyle: 'none',
  '& > li': { position: 'relative' },
  '& > li::before': {
    ...ornamentSx(8),
    content: '""',
    position: 'absolute',
    left: -14,
    top: '0.55em',
  },
});

// A boxed text (a read-aloud, a sidebar): a sheet of paper (SURFACES.paper),
// its title in the heading face, its text in the brown ink.
export const RULE_INSET_SX = Object.freeze({
  ...SURFACES.paper,
  px: 1.5,
  py: 1,
  '& .MuiTypography-root, & li': { color: UI_COLORS.onPaper },
});

export const RULE_INSET_TITLE_SX = Object.freeze({
  ...TEXT_STYLES.title,
  color: UI_COLORS.onPaper,
  mb: 0.25,
});

// The head row of any table or list of columns (a rule's table, a
// catalog's columns, a sheet's attacks): on the panel bar's screentone, ruled
// off in ink.
export const TABLE_HEAD_ROW_SX = Object.freeze({
  backgroundColor: UI_COLORS.surfaceHeader,
  backgroundImage: panelScreentone(UI_COLORS.accent),
  borderBottom: INK_EDGE,
});

// A table: its column titles on that head row, every other row striped
// (SURFACES.stripe).
export const RULE_TABLE_SX = Object.freeze({
  '& thead th': TABLE_HEAD_ROW_SX,
  '& tbody tr:nth-of-type(even)': SURFACES.stripe,
});
