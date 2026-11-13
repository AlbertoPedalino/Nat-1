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
  // A number or short value: HP, AC, an ability score, a skill's modifier, a
  // count, a die. Lettered in the shout face, as the numbers a roll shouts,
  // with an ink outline and its solid shadow.
  figure: Object.freeze({
    fontFamily: UI_FONTS.shout,
    fontWeight: FONT_WEIGHTS.regular,
    // Germania's numerals are as tall as Rubik's were but a third narrower,
    // so at the same size they read small: drawn a third larger (their cap
    // height 0.68 of the size, raised to 0.92) wherever a figure stands, the
    // local sizes untouched.
    fontSizeAdjust: 'cap-height 0.92',
    ...inkLettering(2, 2),
  }),
  // The voice: what happens in the moment, shouted in comic lettering (a
  // roll's name and total, NATURAL 20!, a toast's Done!/Oops!). Always inked: an ink outline and its solid shadow.
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
    // The blackletter's lower case is short (x-height 0.45 of the size) and
    // reads small beside the body text: drawn a fifth larger (raised to
    // 0.55) wherever a heading stands, the local sizes untouched.
    fontSizeAdjust: 'ex-height 0.55',
    // A thinner outline than the shout's: the blackletter's fine strokes
    // would fill in under 2px.
    ...inkLettering(1.5, 2),
  }),
  // A comic cover's title (the app's name on the home page): the heading
  // face, the app's own sign, outlined in ink, its solid shadow set well off.
  cover: Object.freeze({
    fontFamily: UI_FONTS.heading,
    // The blackletter's heaviest cut: a title, not a heading.
    fontWeight: FONT_WEIGHTS.black,
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
