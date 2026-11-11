import { UI_FONTS, LETTER_SPACINGS, FONT_WEIGHTS } from './fonts.js';
import { UI_COLORS } from './colors.js';
import { inkShadow, inkStroke, UI_SHADOWS } from './shadows.js';

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
  // Inked like a comic's lettering.
  figure: Object.freeze({
    fontFamily: UI_FONTS.display,
    fontWeight: FONT_WEIGHTS.bold,
    textShadow: UI_SHADOWS.inkText,
  }),
  // What a roll shouts (NATURAL 20!, NATURAL 1): comic lettering, inked.
  shout: Object.freeze({
    fontFamily: UI_FONTS.shout,
    fontWeight: FONT_WEIGHTS.regular,
    letterSpacing: LETTER_SPACINGS.md,
    textShadow: UI_SHADOWS.inkText,
  }),
  // A comic cover's title (the app's name on the home page): the shout face,
  // outlined in ink, its solid shadow set well off.
  cover: Object.freeze({
    fontFamily: UI_FONTS.shout,
    fontWeight: FONT_WEIGHTS.regular,
    letterSpacing: LETTER_SPACINGS.md,
    ...inkStroke(3),
    textShadow: inkShadow(UI_COLORS.edge, 6),
  }),
  // A quiet aside in the body face: a hint, an empty state, a rules note.
  note: Object.freeze({
    fontStyle: 'italic',
    color: 'text.secondary',
  }),
});
