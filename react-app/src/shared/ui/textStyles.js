import { UI_FONTS, LETTER_SPACINGS, FONT_WEIGHTS } from './fonts.js';

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
  figure: Object.freeze({
    fontFamily: UI_FONTS.display,
    fontWeight: FONT_WEIGHTS.bold,
  }),
  // A quiet aside in the body face: a hint, an empty state, a rules note.
  note: Object.freeze({
    fontStyle: 'italic',
    color: 'text.secondary',
  }),
});
