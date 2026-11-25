import { FONT_FITS, UI_FONTS, LETTER_SPACINGS, FONT_WEIGHTS } from './fonts.js';
import { PLAIN_LETTERING, STAMPED_LETTERING, inkLettering } from './shadows.js';

// The interface's text treatments, by role. Each fixes the typeface, weight,
// spacing and case; size and colour stay with the place that uses it
// (`{ ...TEXT_STYLES.label, fontSize: FONT_SIZES.xs, color: 'text.secondary' }`),
// so a restyle changes how every label, title or figure looks from here.
export const TEXT_STYLES = Object.freeze({
  // Small capitals over a section, a column, a tag: "SAVING THROWS".
  label: Object.freeze({
    fontFamily: UI_FONTS.display,
    // Its own fit, not the body text's (theme.js; fonts.js FONT_FITS).
    fontSizeAdjust: FONT_FITS.caps,
    fontWeight: FONT_WEIGHTS.bold,
    letterSpacing: LETTER_SPACINGS.sm,
    textTransform: 'uppercase',
  }),
  // A name set off from the text around it (an entry's name, a row's title):
  // the rulebook's bold small capitals, as a card's name.
  title: Object.freeze({
    fontFamily: UI_FONTS.cardName,
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
    fontSizeAdjust: FONT_FITS.figure,
    ...inkLettering(2, 2),
  }),
  // A tag's words on its solid chip (TagChip): the figure's face, without its
  // ink — the ink on the chip's tone is the lettering, and an outline and a
  // shadow in that same ink would read as a second, offset copy of the words.
  tag: Object.freeze({
    fontFamily: UI_FONTS.shout,
    fontWeight: FONT_WEIGHTS.regular,
    fontSizeAdjust: FONT_FITS.figure,
  }),
  // The voice: what happens in the moment, shouted in comic lettering (a
  // roll's name and total, NATURAL 20!, a toast's Done!/Oops!). Always inked: an ink outline and its solid shadow.
  shout: Object.freeze({
    fontFamily: UI_FONTS.shout,
    fontSizeAdjust: FONT_FITS.shout,
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
    fontSizeAdjust: FONT_FITS.heading,
    // A thinner outline than the shout's: the blackletter's fine strokes
    // would fill in under 2px.
    ...inkLettering(1.5, 2),
  }),
  // A comic cover's title (the app's name on the home page): the heading
  // face, the app's own sign, outlined in ink, its solid shadow set well off.
  cover: Object.freeze({
    fontFamily: UI_FONTS.heading,
    fontSizeAdjust: FONT_FITS.cover,
    // The blackletter's heaviest cut: a title, not a heading.
    fontWeight: FONT_WEIGHTS.black,
    letterSpacing: LETTER_SPACINGS.sm,
    ...inkLettering(3, 6),
  }),
  // A quiet aside in the prose face: a hint, an empty state, a rules note.
  note: Object.freeze({
    fontFamily: UI_FONTS.prose,
    fontSizeAdjust: FONT_FITS.prose,
    fontStyle: 'italic',
    fontWeight: FONT_WEIGHTS.regular,
    color: 'text.secondary',
  }),
  // The name on a card (an action, a spell, an item, a feature, a result):
  // a rulebook's small capitals, bold.
  cardName: Object.freeze({
    fontFamily: UI_FONTS.cardName,
    fontWeight: FONT_WEIGHTS.bold,
    letterSpacing: LETTER_SPACINGS.sm,
  }),
  // What a machine typed (a telegram's words): the mono face, in capitals,
  // spaced as a typewriter spaces them, never inked.
  typed: Object.freeze({
    fontFamily: UI_FONTS.mono,
    // At its own size: a typewriter's letters are not fitted to the text round them.
    fontSizeAdjust: 'none',
    fontWeight: FONT_WEIGHTS.bold,
    letterSpacing: LETTER_SPACINGS.md,
    textTransform: 'uppercase',
    ...PLAIN_LETTERING,
  }),
  // What a machine stamped into metal (a soldier's tag): typed, and raised.
  stamped: Object.freeze({
    fontFamily: UI_FONTS.mono,
    fontSizeAdjust: 'none',
    fontWeight: FONT_WEIGHTS.bold,
    letterSpacing: LETTER_SPACINGS.md,
    textTransform: 'uppercase',
    ...STAMPED_LETTERING,
  }),
  // The voice printed rather than inked: the shout's face set on a drawing
  // of its own (a page's news on its block, a stamp's words in its frame).
  printed: Object.freeze({
    fontFamily: UI_FONTS.shout,
    fontSizeAdjust: FONT_FITS.shout,
    fontWeight: FONT_WEIGHTS.regular,
    letterSpacing: LETTER_SPACINGS.md,
    ...PLAIN_LETTERING,
  }),
  // Descriptive text (a description, a rules entry): the prose face.
  prose: Object.freeze({
    fontFamily: UI_FONTS.prose,
    fontSizeAdjust: FONT_FITS.prose,
  }),
});

// Words heard, not seen: read aloud by a screen reader, drawn nowhere (a
// count's words beside its seal, a live region's announcements, a table's
// caption). Still rendered, as a region with `display: none` is never read.
// Its box is 1px square: `width: 1` in sx would be the whole width, and the
// words would stretch the page.
export const SPOKEN_ONLY_SX = Object.freeze({
  position: 'absolute',
  width: '1px',
  height: '1px',
  margin: '-1px',
  padding: 0,
  border: 0,
  overflow: 'hidden',
  clipPath: 'inset(50%)',
  whiteSpace: 'nowrap',
});

// Text kept to one line, cut with an ellipsis where it runs out of room (a
// name in a row, a title in a strip). Its box may shrink below the text.
export const ONE_LINE_SX = Object.freeze({
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});
