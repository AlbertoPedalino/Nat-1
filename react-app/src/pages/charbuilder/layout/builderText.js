import { FONT_SIZES, FONT_WEIGHTS } from '../../../shared/ui/fonts.js';
import { TEXT_STYLES } from '../../../shared/ui/textStyles.js';
import {
  captionLabelSx, cardTitleSx, panelTitleSx, sheetBoxTitleSx, sheetSectionHeaderSx,
} from '../../../shared/ui/PanelHeader.jsx';

// The builder's text, by role: the sheet's roles (the same faces, case and
// colours), a step larger, since a builder panel is the page's main content
// rather than a block of a dense sheet. Every builder heading, note and value
// takes its size from here.
export const BUILDER_TEXT = Object.freeze({
  // A panel's name in its PanelHeader bar.
  panelTitle: Object.freeze({ ...panelTitleSx, fontSize: FONT_SIZES.xl }),
  // A framed box inside a panel (a feat's choices, a starting equipment set,
  // an ability score).
  boxTitle: Object.freeze({ ...sheetBoxTitleSx, fontSize: FONT_SIZES.md }),
  // A group of rows inside a panel (Current Inventory).
  sectionHeader: Object.freeze({ ...sheetSectionHeaderSx(), fontSize: FONT_SIZES.md }),
  // The name of a chosen thing (a species, a background, the sheet's state).
  cardTitle: Object.freeze({ ...cardTitleSx, fontSize: FONT_SIZES.body }),
  // The caption over a group of options (Dungeons & Dragons, a background's
  // Skills).
  groupLabel: Object.freeze({ ...captionLabelSx, fontSize: FONT_SIZES.md }),
  // A panel's note and other quiet asides, in italics.
  note: Object.freeze({ ...TEXT_STYLES.note, fontSize: FONT_SIZES.lg }),
  // A plain secondary line: a hint, a count, an empty list ("No matches.").
  hint: Object.freeze({ fontSize: FONT_SIZES.lg, color: 'text.secondary' }),
  // Running text: a description, a line of figures.
  body: Object.freeze({ fontSize: FONT_SIZES.xl }),
  // A bold value on a row (a level, a total).
  value: Object.freeze({ fontSize: FONT_SIZES.xl, fontWeight: FONT_WEIGHTS.bold }),
  // The name of an option in a pick list (a class, a species, an item) and
  // the line under it.
  itemName: Object.freeze({ fontSize: FONT_SIZES.xl, fontWeight: FONT_WEIGHTS.regular, color: 'text.primary' }),
  itemMeta: Object.freeze({ fontSize: FONT_SIZES.md, color: 'text.secondary' }),
});
