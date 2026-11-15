import {
  BASE_PALETTE_ID, LOGO_COLORS, PALETTES, UI_COLORS, colorVariableName, uiMix,
} from './colors.js';
import { BASE_STYLE_ID, SHAPE_STYLES } from './shapes.js';
import { fontStacks } from './fonts.js';

// The dice a player rolls with, two choices apart (themeChoice.js): their
// style, a theme's cut of a die (the face its numbers are lettered in, how
// thick its edge is inked), and their colours, one of the sets below (its face,
// the lighter face round it, the ink of its numbers and its edge). Either is a
// theme's id, the viewer's own theme's unless picked. The viewer's dice are
// worn by every die on their screen; a roll sent to the table carries its
// roller's (rollFeed.js), so the others see the dice that player rolled. Every
// face is dark, so a result's own colour (gold for a 20, red for a 1) reads on
// every set. The app's d20 (appDie.js) is painted in the colours too: `logo`,
// a ramp from light to darkest and the numeral, worked out from the faces where
// a set gives none.
const colorSet = (id, label, { face, faceLit, number, edge, logo }) => Object.freeze({
  id,
  label,
  face,
  faceLit,
  number,
  edge,
  logo: Object.freeze(logo || {
    light: uiMix(faceLit, UI_COLORS.white, 0.45),
    midLight: uiMix(faceLit, UI_COLORS.white, 0.2),
    mid: faceLit,
    midDark: uiMix(faceLit, face, 0.5),
    dark: face,
    darkest: uiMix(face, edge, 0.35),
    numeral: number,
  }),
});

const BASE_DICE = PALETTES[BASE_PALETTE_ID].colors;

export const DICE_COLORS = Object.freeze({
  // The palettes' own dice (their die roles), and the logo's green.
  comic: colorSet('comic', 'Emerald', {
    face: BASE_DICE.dieFace, faceLit: BASE_DICE.dieFaceLit, number: BASE_DICE.onDie, edge: BASE_DICE.dieEdge, logo: LOGO_COLORS,
  }),
  scifi: colorSet('scifi', 'Ice circuit', { face: '#0b2a4a', faceLit: '#1f6fb0', number: '#7ff6ff', edge: '#020814' }),
  gothic: colorSet('gothic', 'Bloodstone', { face: '#4a0d18', faceLit: '#8a1a2c', number: '#f3e6d0', edge: '#0a0306' }),
  war: colorSet('war', 'Olive drab', { face: '#3b4220', faceLit: '#6b7638', number: '#ece4c4', edge: '#0d0f06' }),
  astral: colorSet('astral', 'Starfall', { face: '#1e1648', faceLit: '#4a3c9a', number: '#ffd27a', edge: '#05030f' }),
  pirate: colorSet('pirate', 'Rum and bone', { face: '#4a2a12', faceLit: '#7a4a22', number: '#f3e2bc', edge: '#140a04' }),
  steampunk: colorSet('steampunk', 'Brass', { face: '#6a4416', faceLit: '#b07a26', number: '#fff1c8', edge: '#160d04' }),
  dwarven: colorSet('dwarven', 'Runestone', { face: '#2f343e', faceLit: '#555e70', number: '#ff8a2a', edge: '#0b0d10' }),
  fey: colorSet('fey', 'Orchid', { face: '#5a1f52', faceLit: '#a8429a', number: '#b9ffe0', edge: '#180616' }),
  cosmic: colorSet('cosmic', 'Void', { face: '#120c22', faceLit: '#3a2468', number: '#b6ff3c', edge: '#000000' }),
  pixel: colorSet('pixel', '8-bit', { face: '#1b2f9a', faceLit: '#3f63e8', number: '#ffd23f', edge: '#0b0b22' }),
  cyberpunk: colorSet('cyberpunk', 'Hazard', { face: '#151515', faceLit: '#3a3a12', number: '#fcee0a', edge: '#000000' }),
});

// How thick each theme inks a die's edge, as a share (per cent) of a face:
// Die3D's rim round each face. A console's hairline, a stone's slab.
const RIMS = Object.freeze({
  comic: 9, scifi: 4, gothic: 11, war: 12, astral: 5, pirate: 10,
  steampunk: 7, dwarven: 14, fey: 6, cosmic: 8, pixel: 13, cyberpunk: 5,
});

// A theme's cut of a die: its numbers in the theme's own figures (its shout
// face, as a total is shouted) and its edge as thick as the theme inks it.
function diceStyle(id) {
  const style = SHAPE_STYLES[id] || SHAPE_STYLES[BASE_STYLE_ID];
  return Object.freeze({
    id: style.id,
    label: style.label,
    font: fontStacks(style.id).shout,
    rim: RIMS[style.id] ?? RIMS[BASE_STYLE_ID],
  });
}

export const DICE_STYLES = Object.freeze(Object.fromEntries(Object.keys(SHAPE_STYLES).map((id) => [id, diceStyle(id)])));

// A player's dice as kept and as sent ({ style, colors }), made whole: an
// unknown or missing id is the base theme's.
export function normalizeDice(raw) {
  return Object.freeze({
    style: DICE_STYLES[raw?.style] ? raw.style : BASE_STYLE_ID,
    colors: DICE_COLORS[raw?.colors] ? raw.colors : BASE_STYLE_ID,
  });
}

// Dice a roll carries, made whole; null for none or unknown ones (an older
// client's roll, which is drawn in the viewer's dice).
export function sharedDice(raw) {
  return raw && (DICE_STYLES[raw.style] || DICE_COLORS[raw.colors]) ? normalizeDice(raw) : null;
}

// Dice as drawn: their style's cut and their colours.
export function resolveDice(raw) {
  const { style, colors: colorId } = normalizeDice(raw);
  return { ...DICE_COLORS[colorId], style: DICE_STYLES[style] };
}

// Dice colours as the die roles' variables (UI_COLORS.dieFace…), over the
// palette's: on the page's root for the viewer's dice, on a roll's dice for
// its roller's (DiceSetScope).
export function diceVariables(raw) {
  const { face, faceLit, number, edge } = resolveDice(raw);
  return {
    [colorVariableName('dieFace')]: face,
    [colorVariableName('dieFaceLit')]: faceLit,
    [colorVariableName('onDie')]: number,
    [colorVariableName('dieEdge')]: edge,
  };
}

// The dice the viewer rolls with, for what reads them outside React (a roll
// sent to the table: rollFeed.js). The theme's provider keeps them.
let viewerDice = normalizeDice(null);

export function setViewerDice(raw) {
  viewerDice = normalizeDice(raw);
}

export function viewerDiceChoice() {
  return viewerDice;
}
