import { useEffect, useMemo } from 'react';
import { Box, ThemeProvider } from '@mui/material';
import { buildTheme } from './theme.js';
import { themeVariables, useThemedValuesVersion } from './ThemeChoiceProvider.jsx';
import { paletteOf } from '../shared/ui/colors.js';
import { SHAPE_STYLES, paletteForStyle } from '../shared/ui/shapes.js';
import { linkStyleFonts } from '../shared/ui/fonts.js';
import { usePaletteId, useStyleId } from '../shared/ui/themeIds.js';

// A part of the page drawn in another style than the viewer's, whatever the
// page wears: a roll bubble on the map in the style of the player who rolled
// it, a style's sample in the theme panel. Every variable of that theme
// (themeVariables: palette, shapes, ink, surfaces, faces and the pictures
// worked out in them) is written on the scope, and what is cut in code (a
// gem, a roll's moment) reads that style's MUI theme. The style is drawn in
// the palette it gives the viewer's mode (dark or light), or in `paletteId`.
// Its faces are linked when it is drawn. An unknown style, or the viewer's
// own, is drawn as the page is, with no scope. `sx` is the scope's look
// (none: it lays nothing out, display: contents).
export default function StyleScope({ styleId, paletteId: givenPalette, sx, children }) {
  const viewerStyle = useStyleId();
  const viewerPalette = usePaletteId();
  const known = Boolean(SHAPE_STYLES[styleId]);
  const paletteId = givenPalette ?? (known ? paletteForStyle(styleId, paletteOf(viewerPalette).mode) : viewerPalette);
  const own = !known || (styleId === viewerStyle && paletteId === viewerPalette);
  const theme = useMemo(() => (own ? null : buildTheme({ paletteId, styleId })), [own, paletteId, styleId]);
  // Redrawn when a value is first registered inside it, so it is written too.
  useThemedValuesVersion();
  useEffect(() => {
    if (!own) linkStyleFonts(styleId);
  }, [own, styleId]);

  if (own) return sx ? <Box sx={sx}>{children}</Box> : children;
  return (
    <ThemeProvider theme={theme}>
      <Box sx={[themeVariables(paletteId, styleId), sx ?? { display: 'contents' }]}>{children}</Box>
    </ThemeProvider>
  );
}
