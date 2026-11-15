import {
  createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useState, useSyncExternalStore,
} from 'react';
import { GlobalStyles, ThemeProvider, useMediaQuery } from '@mui/material';
import { buildTheme } from './theme.js';
import {
  DEFAULT_THEME_CHOICE, THEME_CHOICE_KEY, normalizeThemeChoice, paletteForColors, readThemeChoice, writeThemeChoice,
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
  paletteId: paletteForColors(DEFAULT_THEME_CHOICE.colors, false),
  setChoice: () => {},
});

const ThemeChoiceContext = createContext(FIXED_CHOICE);

// The app's theme, as the viewer chose it (themeChoice.js): builds the one MUI
// theme for the chosen palette and style, and writes the palette's variables
// (UI_COLORS' roles), the style's (shapes.js) and the values worked out from them (themedValues.js) on
// the page's root. A choice made in another tab of the app follows here too.
export function ThemeChoiceProvider({ children }) {
  const [choice, setChoiceState] = useState(readThemeChoice);
  const prefersLight = useMediaQuery('(prefers-color-scheme: light)', { noSsr: true });
  const paletteId = paletteForColors(choice.colors, prefersLight);
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

  // The chosen style's faces, loaded when it is chosen (the base style's are
  // linked by index.html already).
  useEffect(() => {
    const href = fontStylesheet(choice.style);
    const links = [...document.querySelectorAll('link[rel="stylesheet"]')];
    if (!href || links.some((link) => link.getAttribute('href') === href)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
  }, [choice.style]);

  const value = useMemo(() => ({ choice, paletteId, setChoice }), [choice, paletteId, setChoice]);

  return (
    <ThemeChoiceContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <ThemeVariables paletteId={paletteId} styleId={choice.style} />
        {children}
      </ThemeProvider>
    </ThemeChoiceContext.Provider>
  );
}

// The viewer's choice ({ colors, style }), the palette it is drawn in, and
// setChoice({ colors?, style? }), which keeps it.
export function useThemeChoice() {
  return useContext(ThemeChoiceContext);
}

// The palette's and the style's variables and the themed values on :root,
// rewritten when the choice changes or a new value is registered (a picture
// first drawn): the store's subscription redraws it then, and only then.
function ThemeVariables({ paletteId, styleId }) {
  useSyncExternalStore(subscribeThemedValues, themedValuesVersion, themedValuesVersion);
  const styles = {
    ':root': {
      colorScheme: paletteOf(paletteId).mode,
      ...paletteVariables(paletteId),
      ...shapeVariables(styleId),
      ...surfaceVariables(paletteId, styleId),
      ...fontVariables(styleId),
      ...themedVariables(paletteId, styleId),
    },
  };
  return <GlobalStyles styles={styles} />;
}
