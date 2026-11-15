import { createContext, useContext, useEffect } from 'react';
import { Box } from '@mui/material';
import { diceVariables, normalizeDice, resolveDice, sharedDice } from './diceSets.js';
import { appDieSvg } from './appDie.js';
import { svgDataUrl } from './svgPicture.js';
import { linkStyleFonts } from './fonts.js';

// Which dice the dice below are drawn as (diceSets.js: { style, colors }): the
// viewer's, set by the theme's provider, or a roll's roller's (DiceSetScope).
const DiceSetContext = createContext(normalizeDice(null));

export const DiceSetProvider = DiceSetContext.Provider;

// The dice here, as drawn: their colours and their style's cut.
export function useDiceSet() {
  return resolveDice(useContext(DiceSetContext));
}

// Dice drawn as `dice` (a roll's roller's: { style, colors }) whatever the
// viewer rolls with: for what reads them (Die3D's faces, the app's d20), with
// their colours as the die roles' variables for what is painted in them, and
// their style's faces loaded. No dice, or unknown ones: the viewer's.
export default function DiceSetScope({ dice, children }) {
  const whole = sharedDice(dice);
  const style = whole?.style;
  useEffect(() => {
    if (style) linkStyleFonts(style);
  }, [style]);
  if (!whole) return children;
  return (
    <DiceSetProvider value={whole}>
      <Box sx={{ display: 'contents', ...diceVariables(whole) }}>{children}</Box>
    </DiceSetProvider>
  );
}

// The app's d20 in a set of colours, as a picture (an <img>'s src, a tab's
// icon), drawn once per set.
const ICONS = new Map();
export function appDieIcon(colorId) {
  const { id, logo, edge } = resolveDice({ colors: colorId });
  if (!ICONS.has(id)) ICONS.set(id, svgDataUrl(appDieSvg(logo, edge)));
  return ICONS.get(id);
}
