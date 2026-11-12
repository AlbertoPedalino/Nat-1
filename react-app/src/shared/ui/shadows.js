import { UI_COLORS, uiAlpha, OPACITY } from './colors.js';

// The drop shadows of surfaces that sit above the page, one per height, so a
// restyle changes depth in one place. Glows and focus rings stay with the
// accent they echo; shadows under map pieces and dice are drawn with them.
// A solid shadow set off to the lower right, in ink or in a moment's colour:
// the comic panel's and the speech bubble's.
export function inkShadow(color = UI_COLORS.edge, offset = 3) {
  return `${offset}px ${offset}px 0 ${color}`;
}

// The ink edge: the 2px black line round every drawn box and control. A frame
// that is not a whole surface (a pill, a stepper, a tile) takes this.
export const INK_EDGE = `2px solid ${UI_COLORS.edge}`;

// A piece laid on the board (a character's token): an ink outline round it
// and its solid shadow under it, so it reads as a cut-out set down on the
// map. Lengths are CSS (they can follow the piece's size: cqmin); `around` is
// what already rings the piece (a turn ring) for the ink to sit outside. On
// the map the shadow is the ink at half strength, so it reads as a shadow on
// the board and never hides the name under the piece; `solid` draws it full,
// as a panel's, for the same piece shown on the dark interface.
export function inkPieceShadow({ outline = '2px', drop = '3px', around = '0px', solid = false } = {}) {
  const spread = `calc(${around} + ${outline})`;
  const shade = solid ? UI_COLORS.edge : uiAlpha(UI_COLORS.edge, OPACITY.strong);
  return `0 0 0 ${spread} ${UI_COLORS.edge}, ${drop} ${drop} 0 ${around} ${shade}`;
}

// Inked lettering: a hard shadow under a title, a big number, a die's numeral.
export function inkTextShadow(color = UI_COLORS.edge) {
  return `1px 1px 0 ${color}`;
}

// An ink outline drawn round big lettering (a cover title), under the fill so
// the letters keep their full weight.
export function inkStroke(width = 3, color = UI_COLORS.edge) {
  return { WebkitTextStroke: `${width}px ${color}`, paintOrder: 'stroke fill' };
}

// An ink outline drawn round a silhouette (an icon drawn large, as the AC
// shield) as a CSS filter, with the solid shadow under it in `shadow`.
export function inkOutlineFilter(color = UI_COLORS.edge, shadow = color) {
  const edge = (x, y) => `drop-shadow(${x}px ${y}px 0 ${color})`;
  return `${edge(1.5, 0)} ${edge(-1.5, 0)} ${edge(0, 1.5)} ${edge(0, -1.5)} drop-shadow(2px 2px 0 ${shadow})`;
}

export const UI_SHADOWS = Object.freeze({
  // A bar resting on the page (the battle map's scene bar).
  raised: `0 8px 24px ${uiAlpha(UI_COLORS.black, OPACITY.shade)}`,
  // Floating controls and notices: toasts, the dice dock, map hints, strips.
  float: `0 6px 20px ${uiAlpha(UI_COLORS.black, OPACITY.strong)}`,
  // Pop-ups over the content: roll bubbles, the dice toast.
  popup: `0 8px 28px ${uiAlpha(UI_COLORS.black, OPACITY.strong)}`,
  // Under what can be pressed (a filled button): a solid ink edge, the drawn
  // look's depth; `pressed` is the same button pushed down.
  press: `0 2px 0 ${UI_COLORS.edge}`,
  pressed: `0 1px 0 ${UI_COLORS.edge}`,
  // The same button lifted under the cursor.
  lifted: `0 3px 0 ${UI_COLORS.edge}`,
  // The comic panel's solid shadow, set off to the lower right: a main panel
  // (`panel`) and a box on the page (`box`).
  panel: inkShadow(),
  box: inkShadow(UI_COLORS.edge, 2),
  // Inked lettering: a hard shadow under titles and big numbers.
  inkText: inkTextShadow(),
  // Dialogs and floating panels.
  overlay: `0 18px 52px ${uiAlpha(UI_COLORS.black, OPACITY.strong)}`,
});
