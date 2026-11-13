import { UI_FONTS, LETTER_SPACINGS, FONT_WEIGHTS } from './fonts.js';
import { inkLettering } from './shadows.js';

// The interface's text treatments, by role. Each fixes the typeface, weight,
// spacing and case; size and colour stay with the place that uses it
// (`{ ...TEXT_STYLES.label, fontSize: FONT_SIZES.xs, color: 'text.secondary' }`),
// so a restyle changes how every label, title or figure looks from here.
export const TEXT_STYLES = Object.freeze({
  // Small capitals over a section, a column, a tag: "SAVING THROWS".
  label: Object.freeze({
    fontFamily: UI_FONTS.display,
    fontWeight: FONT_WEIGHTS.bold,
    letterSpacing: LETTER_SPACINGS.sm,
    textTransform: 'uppercase',
  }),
  // A name or heading set in the display face: a card title, a panel name.
  title: Object.freeze({
    fontFamily: UI_FONTS.display,
    fontWeight: FONT_WEIGHTS.bold,
  }),
  // A number or short value in the display face: HP, AC, a count, a die.
  // Inked like a comic's lettering: the heaviest weight, an ink outline and
  // its solid shadow.
  figure: Object.freeze({
    fontFamily: UI_FONTS.display,
    fontWeight: FONT_WEIGHTS.heavy,
    ...inkLettering(2, 2),
  }),
  // The voice: what happens in the moment, shouted in comic lettering (a
  // roll's name and total, NATURAL 20!, a toast's Done!/Oops!), and the short
  // capitals of a stat tile (AC, STR), where the heading's blackletter would
  // not read. Always inked: an ink outline and its solid shadow.
  shout: Object.freeze({
    fontFamily: UI_FONTS.shout,
    fontWeight: FONT_WEIGHTS.regular,
    letterSpacing: LETTER_SPACINGS.md,
    ...inkLettering(2, 2),
  }),
  // The sign: the name of a place or of someone, read as a heading (a page's,
  // panel's or dialog's title, a tool on the home page, a scene, a
  // character's name). The heading face, inked like the shout.
  heading: Object.freeze({
    fontFamily: UI_FONTS.heading,
    fontWeight: FONT_WEIGHTS.bold,
    // A thinner outline than the shout's: the blackletter's fine strokes
    // would fill in under 2px.
    ...inkLettering(1.5, 2),
  }),
  // A comic cover's title (the app's name on the home page): the heading
  // face, the app's own sign, outlined in ink, its solid shadow set well off.
  cover: Object.freeze({
    fontFamily: UI_FONTS.heading,
    fontWeight: FONT_WEIGHTS.bold,
    letterSpacing: LETTER_SPACINGS.sm,
    ...inkLettering(3, 6),
  }),
  // A quiet aside in the body face: a hint, an empty state, a rules note.
  note: Object.freeze({
    fontStyle: 'italic',
    fontWeight: FONT_WEIGHTS.semibold,
    color: 'text.secondary',
  }),
});

// Text kept to one line, cut with an ellipsis where it runs out of room (a
// name in a row, a title in a strip). Its box may shrink below the text.
export const ONE_LINE_SX = Object.freeze({
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});
