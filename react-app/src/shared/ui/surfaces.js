import { UI_COLORS, uiAlpha, OPACITY, washImage } from './colors.js';
import { PAGE_SCENE_KINDS } from './pageScenes.js';
import { VTT_COLORS } from '../vtt/colors.js';
import { INK_EDGE, UI_SHADOWS, INK_SOLID, panelFloatShadow } from './shadows.js';
import { STICKER_PAPER_SIZE, stickerPaperImage } from './stickerPaper.js';
import { cornerRadius } from './radius.js';
import { styleShapes } from './shapes.js';
import { bannerReach } from './panelBanner.js';

// The interface's surfaces, by kind. A box that is a surface spreads one and
// adds only its own layout (`{ ...SURFACES.panel, p: 1 }`), so a restyle
// changes every panel, well or card from here.
// The page's textures, as the style lays them (shapes.js surface): the paper
// (the stickers, painted in the palette: stickerPaper.js) and a comic print's
// faint halftone dots, `dot` px across every `step` px. Written on the page's
// root with the palette's variables (ThemeChoiceProvider), as `--gb-surface-*`.
export function surfaceVariables(paletteId, styleId) {
  const { surface: { paper, halftone }, panel } = styleShapes(styleId);
  const bare = panel.badge === 'bare';
  return {
    ...panelVariables(panel, bare),
    ...pagePaper(paper, paletteId),
    '--gb-surface-halftone': halftone
      ? `radial-gradient(${uiAlpha(UI_COLORS.textPrimary, OPACITY.wash)} ${halftone.dot}px, transparent ${halftone.dot + 0.4}px)`
      : 'none',
    '--gb-surface-halftone-size': halftone ? `${halftone.step}px ${halftone.step}px` : 'auto',
  };
}

// The page's drawings, as the style lays them (shapes.js surface.paper): the
// comic's sticker paper (pictures painted per palette, stickerPaper.js), a
// scene (pageScenes.js) or none.
function pagePaper(paper, paletteId) {
  if (paper === 'stickers') return { '--gb-surface-paper': stickerPaperImage(paletteId), '--gb-surface-paper-size': STICKER_PAPER_SIZE };
  // A scene is laid once behind the whole app (theme.js): the page lets it
  // through.
  if (PAGE_SCENE_KINDS.includes(paper)) return { '--gb-surface-paper': 'none', '--gb-surface-paper-size': 'auto', '--gb-surface-page-fill': 'transparent' };
  return { '--gb-surface-paper': 'none', '--gb-surface-paper-size': 'auto' };
}

// How the style builds a panel (shapes.js panel), as whole values the panel's
// recipes read (PanelHeader.jsx, SURFACES.panel): the comic's own values where
// the style builds as the comic does, so its panels are drawn exactly as they
// were. A variable set to `initial` is unset: its recipe falls back to the
// panel's tone.
function panelVariables(panel, bare) {
  const reaches = panel.grip !== 'none' || bannerReach(panel.banner) > 0;
  const float = (solid, fall, blur) => (panel.float ? `${solid}, ${panelFloatShadow(panel.float, fall, blur)}` : solid);
  return {
    // The bar: the header's paper, or none over a rule in the panel's tone.
    '--gb-panel-bar-paper': panel.bar === 'fill' ? UI_COLORS.surfaceHeader : 'transparent',
    '--gb-panel-bar-rule': panel.bar === 'rule' ? 'initial' : UI_COLORS.edge,
    '--gb-panel-bar-hatch': panel.hatch ? 'auto' : '0 0',
    // The badge: a seal in the tone with the ink on it, or the drawing bare.
    '--gb-panel-badge-fill': bare ? 'transparent' : 'initial',
    '--gb-panel-badge-ink': bare ? 'initial' : UI_COLORS.onFill,
    '--gb-panel-badge-edge': bare ? 'none' : INK_EDGE,
    '--gb-panel-badge-shadow': bare ? 'none' : UI_SHADOWS.box,
    // A main panel keeps what is in it inside its frame, unless the style
    // draws past its edges (a grip, shapes.js panel.grip; a banner that
    // reaches out, panelBanner.js bannerReach)…
    '--gb-panel-overflow': reaches ? 'visible' : 'hidden',
    // …and the page cuts that at the window's side (theme.js html).
    '--gb-page-overflow-x': reaches ? 'clip' : 'visible',
    // The shadows of a main panel and of a framed box.
    '--gb-panel-shadow': float(UI_SHADOWS.panel, 6, 18),
    '--gb-panel-box-shadow': float(UI_SHADOWS.box, 3, 10),
  };
}

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
      // The rays, over a pool of the page's own colour that quiets the
      // paper's drawings behind the title.
      backgroundImage: [
        // Each ray's edges fade over a degree and a half: hard stops in a conic
        // gradient are drawn jagged.
        `repeating-conic-gradient(from 0deg at 50% 50%, transparent 0deg, ${uiAlpha(color, OPACITY.shade)} 1.5deg 6deg, transparent 7.5deg 15deg)`,
        `radial-gradient(ellipse closest-side, ${UI_COLORS.page} 35%, transparent 100%)`,
      ].join(', '),
      maskImage: 'radial-gradient(ellipse closest-side, black 30%, transparent 100%)',
      // As strongly as the style shines them (shapes.js surface.rays).
      opacity: 'var(--gb-surface-rays)',
    },
  };
}

// A list that scrolls inside a panel (the builder's options, a picker's
// results): the sunken well, its height capped at `maxHeight`.
export function scrollWellSx(maxHeight) {
  return { ...SURFACES.inset, maxHeight, overflow: 'auto' };
}

// A surface lit in a tone (the combatant whose turn it is, the step to take
// next, a chosen option, a callout): the tone laid as a wash OVER a solid
// base, never in place of it. A translucent background would let the page's
// drawings show through what is being read. `amount` is how strong the wash
// is (an OPACITY step); `base` the solid surface under it.
export function tintedSurfaceSx(tone, { amount = OPACITY.tint, base = 'background.paper' } = {}) {
  return { bgcolor: base, backgroundImage: washImage(tone, amount) };
}

// washImage (the wash alone, as a background image) lives with the palette
// in colors.js, so the colour helpers can use it without importing surfaces.
export { washImage };

// A card that wears a colour for what it is (a magic item's rarity):
// `tone` washed over the card's header paper, one strength for every such
// card.
export function cardToneSx(tone) {
  return tintedSurfaceSx(tone, { amount: OPACITY.tint, base: UI_COLORS.surfaceHeader });
}

// A callout in a tone, set apart from the dialog or list it sits in: a
// concluded negotiation, a rolled fumble, a condition's rules card. The 2px
// edge in its tone over a soft wash of it. `tone` is a palette colour (hex).
export function calloutSx(tone) {
  return { border: INK_SOLID, borderColor: tone, borderRadius: 1, ...tintedSurfaceSx(tone, { amount: OPACITY.soft }) };
}

// The empty track of a meter (a hit point or XP bar, the encounter's
// difficulty, a negotiation's pips), `height` tall: sunken and edged in ink,
// solid so it reads the same over the paper and over a map; the filled part is
// drawn over it in the meter's own colour.
export function meterTrackSx(height) {
  return {
    height, border: INK_EDGE, borderRadius: 1, bgcolor: UI_COLORS.surfaceSunken, boxSizing: 'border-box',
  };
}

export const SURFACES = Object.freeze({
  // A raised box: a section, a card, a block of the sheet.
  panel: Object.freeze({
    bgcolor: 'background.paper',
    border: INK_EDGE,
    borderRadius: 1,
    // Its solid shadow, and a soft one as the style floats its panels.
    boxShadow: 'var(--gb-panel-box-shadow)',
  }),
  // A card inside a panel: the drawn edge, lifted a little off the panel
  // (interactive.js CARD_SX lights it under the cursor).
  card: Object.freeze({
    bgcolor: 'background.paper',
    border: INK_EDGE,
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
  // The page behind everything: the background with the game's things drawn
  // small all over it (stickerPaper.js) over a comic print's faint halftone
  // dots, as the style lays them (surfaceVariables).
  page: Object.freeze({
    // The page's colour, or none where the style lays a scene behind it.
    bgcolor: (theme) => `var(--gb-surface-page-fill, ${theme.palette.background.default})`,
    backgroundImage: 'var(--gb-surface-paper), var(--gb-surface-halftone)',
    backgroundSize: 'var(--gb-surface-paper-size), var(--gb-surface-halftone-size)',
  }),
  // A sunken well inside a panel: the details under a row, a field group.
  inset: Object.freeze({
    bgcolor: UI_COLORS.surfaceSunken,
    border: INK_EDGE,
    borderRadius: 1,
  }),
  // A light row or tile laid on the page: list entries, stat tiles.
  wash: Object.freeze({
    ...tintedSurfaceSx(UI_COLORS.white, { amount: OPACITY.faint }),
    border: INK_EDGE,
    borderRadius: 1,
  }),
  // Paper laid on the interface: a rulebook's boxed text (a read-aloud, a
  // sidebar), a picture that is missing. The ivory shading to its foot, the
  // brown ink on it, edged in ink with its solid shadow, its corners cut
  // unevenly as a torn-out page's (the style's paper, shapes.js).
  paper: Object.freeze({
    backgroundColor: UI_COLORS.paper,
    backgroundImage: `linear-gradient(${UI_COLORS.paper}, ${UI_COLORS.paperShade})`,
    color: UI_COLORS.onPaper,
    border: INK_EDGE,
    borderRadius: (theme) => cornerRadius(...styleShapes(theme.gmboard?.styleId).paper.corners)(theme),
    boxShadow: UI_SHADOWS.box,
  }),
  // Every other row of a long, dense list or table (a catalog, a rule's
  // table): a faint wash, so the eye keeps its row across.
  stripe: Object.freeze({ backgroundImage: washImage(UI_COLORS.white, OPACITY.faint) }),
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
  // What floats over the page for a moment: every menu, select list,
  // popover, autocomplete list and tooltip (set in the theme). The raised
  // paper in the ink edge, with the panel's solid shadow. Written in CSS
  // keys, so the theme's overrides can take it as it is.
  floating: Object.freeze({
    backgroundColor: UI_COLORS.surfaceRaised,
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
