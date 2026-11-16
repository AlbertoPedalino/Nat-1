import {
  createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useState, useSyncExternalStore,
} from 'react';
import { GlobalStyles, ThemeProvider, useMediaQuery } from '@mui/material';
import { themeFor } from './theme.js';
import {
  DEFAULT_THEME_CHOICE, THEME_CHOICE_KEY, chosenDice, normalizeThemeChoice, readThemeChoice,
  resolvedMode, writeThemeChoice,
} from './themeChoice.js';
import { diceVariables, normalizeDice, setViewerDice } from '../shared/ui/diceSets.js';
import { DiceSetProvider, appDieIcon } from '../shared/ui/DiceSetScope.jsx';
import { paletteOf, paletteVariables } from '../shared/ui/colors.js';
import { BASE_STYLE_ID, paletteForStyle, setViewerStyle, shapeVariables } from '../shared/ui/shapes.js';
import { surfaceVariables } from '../shared/ui/surfaces.js';
import { fontVariables, linkStyleFonts } from '../shared/ui/fonts.js';
import { subscribeThemedValues, themedValuesVersion, themedVariables } from '../shared/ui/themedValues.js';
import { useEventListener } from '../shared/ui/useEventListener.js';

// Outside the provider (a part rendered on its own, as in a test) the choice
// is the default one and cannot be changed.
const FIXED_CHOICE = Object.freeze({
  choice: DEFAULT_THEME_CHOICE,
  mode: resolvedMode(DEFAULT_THEME_CHOICE.mode, false),
  paletteId: paletteForStyle(DEFAULT_THEME_CHOICE.style, resolvedMode(DEFAULT_THEME_CHOICE.mode, false)),
  setChoice: () => {},
});

const ThemeChoiceContext = createContext(FIXED_CHOICE);

// The app's theme, as the viewer chose it (themeChoice.js): the chosen style in
// the palette it draws the chosen mode in. Builds the one MUI theme for them,
// and writes the palette's variables
// (UI_COLORS' roles), the style's (shapes.js) and the values worked out from them (themedValues.js) on
// the page's root. A choice made in another tab of the app follows here too.
export function ThemeChoiceProvider({ children }) {
  const [choice, setChoiceState] = useState(readThemeChoice);
  const prefersLight = useMediaQuery('(prefers-color-scheme: light)', { noSsr: true });
  const mode = resolvedMode(choice.mode, prefersLight);
  const paletteId = paletteForStyle(choice.style, mode);
  const theme = themeFor(paletteId, choice.style);
  const { style: diceStyle, colors: diceColors } = chosenDice(choice);
  const dice = useMemo(() => normalizeDice({ style: diceStyle, colors: diceColors }), [diceStyle, diceColors]);
  // The dice and the style rolls sent to the table carry (rollFeed.js), kept
  // as it renders.
  setViewerDice(dice);
  setViewerStyle(choice.style);

  const setChoice = useCallback((patch) => {
    setChoiceState((current) => {
      const next = normalizeThemeChoice({ ...current, ...patch });
      writeThemeChoice(next);
      return next;
    });
  }, []);

  useEventListener(globalThis.window, 'storage', (event) => {
    if (event.key === THEME_CHOICE_KEY) setChoiceState(readThemeChoice());
  });

  // On the root for what reads the page outside React (index.html's first paint).
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.dataset.palette = paletteId;
    root.dataset.style = choice.style;
  }, [paletteId, choice.style]);

  // The chosen style's faces, loaded when it is chosen.
  useEffect(() => linkStyleFonts(choice.style), [choice.style]);
  // The dice's figures, when their cut is another style's.
  useEffect(() => linkStyleFonts(diceStyle), [diceStyle]);

  // The tab's icon: the app's d20 in the viewer's dice (index.html links the
  // comic one, public/favicon.svg).
  useEffect(() => {
    const icon = document.querySelector('link[rel="icon"][type="image/svg+xml"]');
    if (!icon) return;
    if (!icon.dataset.file) icon.dataset.file = icon.getAttribute('href');
    icon.setAttribute('href', diceColors === BASE_STYLE_ID ? icon.dataset.file : appDieIcon(diceColors));
  }, [diceColors]);

  const value = useMemo(() => ({ choice, mode, paletteId, setChoice }), [choice, mode, paletteId, setChoice]);

  return (
    <ThemeChoiceContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <DiceSetProvider value={dice}>
          <ThemeVariables paletteId={paletteId} styleId={choice.style} dice={dice} />
          {children}
        </DiceSetProvider>
      </ThemeProvider>
    </ThemeChoiceContext.Provider>
  );
}

// The viewer's choice ({ mode, style, diceStyle, diceColors }), the mode it is drawn in now
// (`mode`: dark or light, System resolved), the palette, and setChoice({ mode?,
// style?, diceStyle?, diceColors? }), which keeps it.
export function useThemeChoice() {
  return useContext(ThemeChoiceContext);
}

// Every variable a theme fills, a palette and a style together: the palette's
// roles, the style's shapes and ink, surfaces and faces, and the values worked
// out in them (themedValues.js). What the page's root wears, and what a
// style's sample in the theme panel wears on itself (ThemeDialog), so a sample
// is drawn in its own theme whatever the page wears.
// Worked out once for each palette and style while no value is newly
// registered: the page's root and every StyleScope ask for them on each render.
const VARIABLES = new Map();
export function themeVariables(paletteId, styleId) {
  const key = `${paletteId}|${styleId}|${themedValuesVersion()}`;
  if (!VARIABLES.has(key)) {
    VARIABLES.set(key, {
      colorScheme: paletteOf(paletteId).mode,
      ...paletteVariables(paletteId),
      ...shapeVariables(styleId),
      ...surfaceVariables(paletteId, styleId),
      ...fontVariables(styleId),
      ...themedVariables(paletteId, styleId),
    });
  }
  return VARIABLES.get(key);
}

// Redraws its caller when a themed value is first registered (a picture first
// drawn), so the variables it writes include it.
export function useThemedValuesVersion() {
  return useSyncExternalStore(subscribeThemedValues, themedValuesVersion, themedValuesVersion);
}


// The chosen theme's variables on :root, the viewer's dice over the palette's.
function ThemeVariables({ paletteId, styleId, dice }) {
  useThemedValuesVersion();
  return <GlobalStyles styles={{ ':root': { ...themeVariables(paletteId, styleId), ...diceVariables(dice) } }} />;
}
