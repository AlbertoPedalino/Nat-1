// The app-wide stacking order of fixed layers, lowest to highest. Stacking
// inside one component (a badge over its card) stays local and small.
export const LAYERS = Object.freeze({
  // Floating map panels inside the battle map's fullscreen element.
  mapFloating: 10,
  mapTray: 11,
  // The dice toast over every page.
  diceToast: 999,
  // The battle map in its covering (mobile) fullscreen.
  mapCover: 1200,
  // The compendium side panel, over every page, under the top bar.
  compendium: 1250,
  // The app's top bar.
  topBar: 1300,
});
