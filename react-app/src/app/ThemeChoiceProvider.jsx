import {
  createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useState, useSyncExternalStore,
} from 'react';
import { GlobalStyles, ThemeProvider, useMediaQuery } from '@mui/material';
import { buildTheme } from './theme.js';
import {
  DEFAULT_THEME_CHOICE, THEME_CHOICE_KEY, normalizeThemeChoice, paletteForStyle, readThemeChoice, resolvedMode,
  writeThemeChoice,
} from './themeChoice.js';
import { paletteOf, paletteVariables } from '../shared/ui/colors.js';
import { shapeVariables } from '../shared/ui/shapes.js';
import { surfaceVariables } from '../shared/ui/surfaces.js';
import { fontStylesheet, fontVariables } from '../shared/ui/fonts.js';
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
  const theme = useMemo(() => buildTheme({ paletteId, styleId: choice.style }), [paletteId, choice.style]);

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

  const value = useMemo(() => ({ choice, mode, paletteId, setChoice }), [choice, mode, paletteId, setChoice]);

  return (
    <ThemeChoiceContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <ThemeVariables paletteId={paletteId} styleId={choice.style} />
        {children}
      </ThemeProvider>
    </ThemeChoiceContext.Provider>
  );
}

// The viewer's choice ({ mode, style }), the mode it is drawn in now (`mode`:
// dark or light, System resolved), the palette, and setChoice({ mode?,
// style? }), which keeps it.
export function useThemeChoice() {
  return useContext(ThemeChoiceContext);
}

// Every variable a theme fills, a palette and a style together: the palette's
// roles, the style's shapes and ink, surfaces and faces, and the values worked
// out in them (themedValues.js). What the page's root wears, and what a
// style's sample in the theme panel wears on itself (ThemeDialog), so a sample
// is drawn in its own theme whatever the page wears.
export function themeVariables(paletteId, styleId) {
  return {
    colorScheme: paletteOf(paletteId).mode,
    ...paletteVariables(paletteId),
    ...shapeVariables(styleId),
    ...surfaceVariables(paletteId, styleId),
    ...fontVariables(styleId),
    ...themedVariables(paletteId, styleId),
  };
}

// Redraws its caller when a themed value is first registered (a picture first
// drawn), so the variables it writes include it.
export function useThemedValuesVersion() {
  return useSyncExternalStore(subscribeThemedValues, themedValuesVersion, themedValuesVersion);
}

// Links a style's faces once (the base style's are linked by index.html).
export function linkStyleFonts(styleId) {
  const href = fontStylesheet(styleId);
  const links = [...document.querySelectorAll('link[rel="stylesheet"]')];
  if (!href || links.some((link) => link.getAttribute('href') === href)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
}

// The chosen theme's variables on :root.
function ThemeVariables({ paletteId, styleId }) {
  useThemedValuesVersion();
  return <GlobalStyles styles={{ ':root': themeVariables(paletteId, styleId) }} />;
}
