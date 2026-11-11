import { UI_COLORS, uiAlpha, OPACITY } from './colors.js';

// The drop shadows of surfaces that sit above the page, one per height, so a
// restyle changes depth in one place. Glows and focus rings stay with the
// accent they echo; shadows under map pieces and dice are drawn with them.
// A solid shadow set off to the lower right, in ink or in a moment's colour:
// the comic panel's and the speech bubble's.
export function inkShadow(color = UI_COLORS.edge, offset = 3) {
  return `${offset}px ${offset}px 0 ${color}`;
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
  inkText: `1px 1px 0 ${UI_COLORS.edge}`,
  // Dialogs and floating panels.
  overlay: `0 18px 52px ${uiAlpha(UI_COLORS.black, OPACITY.strong)}`,
});
