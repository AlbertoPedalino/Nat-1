import { UI_COLORS, uiAlpha, OPACITY } from './colors.js';
import { VTT_COLORS, vttAlpha } from '../vtt/colors.js';
import { UI_SHADOWS } from './shadows.js';

// The interface's surfaces, by kind. A box that is a surface spreads one and
// adds only its own layout (`{ ...SURFACES.panel, p: 1 }`), so a restyle
// changes every panel, well or card from here.
export const SURFACES = Object.freeze({
  // A raised box: a section, a card, a block of the sheet.
  panel: Object.freeze({
    bgcolor: 'background.paper',
    border: 2,
    borderColor: UI_COLORS.edge,
    borderRadius: 1,
    boxShadow: UI_SHADOWS.box,
  }),
  // The page behind everything: the background with a comic print's faint
  // halftone dots.
  page: Object.freeze({
    bgcolor: 'background.default',
    backgroundImage: `radial-gradient(${uiAlpha(UI_COLORS.textPrimary, OPACITY.wash)} 1px, transparent 1.4px)`,
    backgroundSize: '7px 7px',
  }),
  // A sunken well inside a panel: the details under a row, a field group.
  inset: Object.freeze({
    bgcolor: UI_COLORS.surfaceSunken,
    border: 1,
    borderColor: 'divider',
    borderRadius: 1,
  }),
  // A light row or tile laid on the page: list entries, stat tiles.
  wash: Object.freeze({
    bgcolor: uiAlpha(UI_COLORS.white, OPACITY.faint),
    border: 1,
    borderColor: 'divider',
    borderRadius: 1,
  }),
  // The battle map's glass: every panel and dialog floating over the board.
  // No backdrop blur: the surface is 95% opaque, so a blur behind it cannot be
  // seen, and over a map where something always moves it is redone every
  // frame — measured at ~100ms a frame on desktop under the roll toast.
  map: Object.freeze({
    bgcolor: 'gmboard.vtt.surface',
    backgroundImage: 'none',
    border: '1px solid',
    borderColor: 'gmboard.vtt.accentBorder',
  }),
  // A small control on the map (round icon buttons, corner toggles).
  mapControl: Object.freeze({
    bgcolor: vttAlpha(VTT_COLORS.surface, OPACITY.veil),
    border: `1px solid ${vttAlpha(VTT_COLORS.accent, OPACITY.line)}`,
  }),
});
