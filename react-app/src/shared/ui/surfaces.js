import { UI_COLORS, uiAlpha, OPACITY } from './colors.js';
import { VTT_COLORS } from '../vtt/colors.js';
import { INK_EDGE, UI_SHADOWS } from './shadows.js';

// The interface's surfaces, by kind. A box that is a surface spreads one and
// adds only its own layout (`{ ...SURFACES.panel, p: 1 }`), so a restyle
// changes every panel, well or card from here.
// A comic print's faint halftone dots, behind the page and the map's panels.
const HALFTONE = `radial-gradient(${uiAlpha(UI_COLORS.textPrimary, OPACITY.wash)} 1px, transparent 1.4px)`;
const HALFTONE_SIZE = '7px 7px';

// A comic cover's sunburst: rays in `color` fanning out from behind a title,
// fading out before the edge of the box the title sits in (spread on it).
export function coverRaysSx(color = UI_COLORS.accent) {
  return {
    position: 'relative',
    isolation: 'isolate',
    '&::before': {
      content: '""',
      position: 'absolute',
      // Within the cover's height, wider than it: the rays never reach
      // what sits under the title.
      inset: '0 -30%',
      zIndex: -1,
      pointerEvents: 'none',
      backgroundImage: `repeating-conic-gradient(from 0deg at 50% 50%, ${uiAlpha(color, OPACITY.soft)} 0deg 7deg, transparent 7deg 15deg)`,
      maskImage: 'radial-gradient(ellipse closest-side, black 30%, transparent 100%)',
    },
  };
}

// A list that scrolls inside a panel (the builder's options, a picker's
// results): the sunken well, its height capped at `maxHeight`.
export function scrollWellSx(maxHeight) {
  return { ...SURFACES.inset, maxHeight, overflow: 'auto' };
}

export const SURFACES = Object.freeze({
  // A raised box: a section, a card, a block of the sheet.
  panel: Object.freeze({
    bgcolor: 'background.paper',
    border: 2,
    borderColor: UI_COLORS.edge,
    borderRadius: 1,
    boxShadow: UI_SHADOWS.box,
  }),
  // A card inside a panel: the drawn edge, lifted a little off the panel
  // (interactive.js CARD_SX lights it under the cursor).
  card: Object.freeze({
    bgcolor: 'background.paper',
    border: 2,
    borderColor: UI_COLORS.edge,
    borderRadius: 1,
    boxShadow: UI_SHADOWS.box,
  }),
  // A page's own header under the app's top bar (the sheet's character
  // header, the builder's title bar): the paper, closed by the ink edge.
  pageHeader: Object.freeze({
    bgcolor: 'background.paper',
    backgroundImage: 'none',
    borderBottom: INK_EDGE,
  }),
  // The page behind everything: the background with a comic print's faint
  // halftone dots.
  page: Object.freeze({
    bgcolor: 'background.default',
    backgroundImage: HALFTONE,
    backgroundSize: HALFTONE_SIZE,
  }),
  // A sunken well inside a panel: the details under a row, a field group.
  inset: Object.freeze({
    bgcolor: UI_COLORS.surfaceSunken,
    border: 2,
    borderColor: UI_COLORS.edge,
    borderRadius: 1,
  }),
  // A light row or tile laid on the page: list entries, stat tiles.
  wash: Object.freeze({
    bgcolor: uiAlpha(UI_COLORS.white, OPACITY.faint),
    border: 2,
    borderColor: UI_COLORS.edge,
    borderRadius: 1,
  }),
  // The battle map's glass: every panel and dialog floating over the board.
  // No backdrop blur: the surface is 95% opaque, so a blur behind it cannot be
  // seen, and over a map where something always moves it is redone every
  // frame — measured at ~100ms a frame on desktop under the roll toast.
  // Drawn like every panel: the ink edge and a solid shadow. No halftone: over
  // a see-through panel on a busy map the dots are noise that hides the
  // buttons; a map bar that wants a texture takes the screentone instead.
  map: Object.freeze({
    bgcolor: 'gmboard.vtt.surface',
    backgroundImage: 'none',
    border: INK_EDGE,
    boxShadow: UI_SHADOWS.box,
  }),
  // A small control on the map (round icon buttons, corner toggles): the
  // raised button's edge and press.
  mapControl: Object.freeze({
    bgcolor: VTT_COLORS.surface,
    border: INK_EDGE,
    boxShadow: UI_SHADOWS.press,
  }),
});
