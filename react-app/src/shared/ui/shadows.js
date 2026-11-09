import { UI_COLORS, uiAlpha, OPACITY } from './colors.js';

// The drop shadows of surfaces that sit above the page, one per height, so a
// restyle changes depth in one place. Glows and focus rings stay with the
// accent they echo; shadows under map pieces and dice are drawn with them.
export const UI_SHADOWS = Object.freeze({
  // A bar resting on the page (the battle map's scene bar).
  raised: `0 8px 24px ${uiAlpha(UI_COLORS.black, OPACITY.shade)}`,
  // Floating controls and notices: toasts, the dice dock, map hints, strips.
  float: `0 6px 20px ${uiAlpha(UI_COLORS.black, OPACITY.strong)}`,
  // Pop-ups over the content: roll bubbles, the dice toast.
  popup: `0 8px 28px ${uiAlpha(UI_COLORS.black, OPACITY.strong)}`,
  // Dialogs and floating panels.
  overlay: `0 18px 52px ${uiAlpha(UI_COLORS.black, OPACITY.strong)}`,
});
