import { UI_COLORS, uiAlpha, OPACITY, paletteOf, washImage } from './colors.js';
import { PAGE_SCENE_KINDS } from './pageScenes.js';
import { publicAsset } from '../publicAsset.js';
import { VTT_COLORS } from '../vtt/colors.js';
import {
  INK_EDGE, UI_SHADOWS, INK_SOLID, lightShadowVariables, panelFloatShadow, shadeShare, wellShadow,
} from './shadows.js';
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
  const { surface: { paper, halftone }, panel, light } = styleShapes(styleId);
  const { mode } = paletteOf(paletteId);
  // No dots where the style prints none (a dot of 0).
  const dots = halftone && halftone.dot > 0;
  return {
    ...panelVariables(panel),
    ...pagePaper(paper, paletteId, light.page),
    ...lightShadowVariables(light, mode),
    ...finishVariables(light.finish, mode),
    '--gb-surface-halftone': dots
      ? `radial-gradient(${uiAlpha(UI_COLORS.textPrimary, OPACITY.wash)} ${halftone.dot}px, transparent ${halftone.dot + 0.4}px)`
      : 'none',
    '--gb-surface-halftone-size': dots ? `${halftone.step}px ${halftone.step}px` : 'auto',
  };
}

// The page's drawings, as the style lays them (shapes.js surface.paper): the
// comic's sticker paper (pictures painted per palette, stickerPaper.js), a
// scene (pageScenes.js) or none.
function pagePaper(paper, paletteId, pageLight) {
  if (paper === 'stickers') return { '--gb-surface-paper': stickerPaperImage(paletteId), '--gb-surface-paper-size': STICKER_PAPER_SIZE };
  // A scene, and the light a style throws on its page (PAGE_LIGHTS), are laid
  // once behind the whole app (theme.js): the page lets them through.
  const behind = PAGE_SCENE_KINDS.includes(paper) || pageLight !== 'none';
  return { '--gb-surface-paper': 'none', '--gb-surface-paper-size': 'auto', ...(behind ? { '--gb-surface-page-fill': 'transparent' } : null) };
}

// How a style shades its surfaces (shapes.js light.finish), where the comic
// lays one flat colour: the shading of a main panel (`panel`, panelFrameSx)
// and of a box, a card or what floats (`box`), each a background image laid
// over the surface's own colour, its shades as deep as the palette's mode
// takes them (`shade`: a share). `flat` shades none.
//   lamp: a desk lamp from the upper left — a pool of warm light in a panel's
//   corner, its foot falling into shade; a box lit along its top.
// A box lit along its top in `light`, its foot in shade: a finish's `box`
// wherever the light comes from above.
const litFromAbove = (light, shade) => `linear-gradient(${uiAlpha(light, OPACITY.wash)}, transparent 55%, ${uiAlpha(UI_COLORS.black, OPACITY.shade * shade)})`;

const SURFACE_FINISHES = Object.freeze({
  flat: null,
  lamp: (shade) => ({
    panel: [
      `radial-gradient(120% 90% at 0% 0%, ${uiAlpha(UI_COLORS.accentHighlight, OPACITY.soft)}, transparent 60%)`,
      `linear-gradient(${uiAlpha(UI_COLORS.white, OPACITY.faint)}, transparent 30%, ${uiAlpha(UI_COLORS.black, OPACITY.line * shade)})`,
    ].join(', '),
    box: litFromAbove(UI_COLORS.white, shade),
  }),
  // glow: a cold light from overhead — a panel lit across its head, its foot
  // falling into shade; a box lit along its top.
  glow: (shade) => ({
    panel: [
      `radial-gradient(90% 70% at 50% 0%, ${uiAlpha(UI_COLORS.textPrimary, OPACITY.soft)}, transparent 70%)`,
      `linear-gradient(transparent 35%, ${uiAlpha(UI_COLORS.black, OPACITY.line * shade)})`,
    ].join(', '),
    box: litFromAbove(UI_COLORS.textPrimary, shade),
  }),
  // ember: a fire below — a warm glow rising from a panel's foot, its head
  // in the dark; a box warmed along its foot.
  ember: (shade) => ({
    panel: [
      `radial-gradient(100% 60% at 50% 100%, ${uiAlpha(UI_COLORS.accent, OPACITY.tint)}, transparent 70%)`,
      `linear-gradient(${uiAlpha(UI_COLORS.black, OPACITY.line * shade)}, transparent 45%)`,
    ].join(', '),
    box: `linear-gradient(${uiAlpha(UI_COLORS.black, OPACITY.shade * shade)}, transparent 55%, ${uiAlpha(UI_COLORS.accent, OPACITY.wash)})`,
  }),
  // grime: plate and canvas gone dirty — the dark gathered in a panel's
  // corners, a cold light thin along its top; a box dark at its corners.
  grime: (shade) => ({
    panel: [
      `radial-gradient(130% 115% at 50% 40%, transparent 52%, ${uiAlpha(UI_COLORS.black, OPACITY.strong * shade)})`,
      `linear-gradient(${uiAlpha(UI_COLORS.textPrimary, OPACITY.wash)}, transparent 22%)`,
    ].join(', '),
    box: `radial-gradient(140% 135% at 50% 35%, transparent 48%, ${uiAlpha(UI_COLORS.black, OPACITY.edge * shade)})`,
  }),
});

export const SURFACE_FINISH_KINDS = Object.freeze(Object.keys(SURFACE_FINISHES));

// A finish as the variables the surfaces read (surfaceFinish). Unset
// (`initial`) where the style lays flat colour, so a surface keeps whatever
// background it had.
function finishVariables(kind, mode) {
  const finish = SURFACE_FINISHES[kind]?.(shadeShare(mode));
  return {
    '--gb-surface-finish-panel': finish ? finish.panel : 'initial',
    '--gb-surface-finish-box': finish ? finish.box : 'initial',
  };
}

// The style's shading of a surface (`panel` or `box`) as its background
// image; `otherwise` where it shades none: what the element would have had
// (MUI's own overlay on a raised Paper, by default).
export function surfaceFinish(kind, otherwise = 'var(--Paper-overlay)') {
  return `var(--gb-surface-finish-${kind}, ${otherwise})`;
}

// The light a style throws on its page (shapes.js light.page), behind every
// screen: background images, the topmost first. `none` throws none.
//   blinds: a street lamp through venetian blinds — slats of warm light
//   slanting from the upper left, lost in the dark towards the corners, under
//   a film's grain.
// A film's grain: a tile of white specks, faint. A picture made once
// (public/textures/grain.png, the fractal noise the page used to work out in
// an SVG filter, rendered), as a noise filter behind a page being scrolled
// cost the most of anything on it to paint.
const GRAIN_FILE = 'textures/grain.png';
const GRAIN = `url("${publicAsset(GRAIN_FILE)}")`;
// The pictures the surfaces ship (public/), for what checks they are there.
export const SURFACE_PICTURES = Object.freeze([GRAIN_FILE]);
// The page's corners lost in the dark, as deep as `depth` (an OPACITY step),
// the middle left clear out to `clear` percent.
const darkCorners = (clear, depth) => `radial-gradient(120% 95% at 50% 32%, transparent ${clear}%, ${uiAlpha(UI_COLORS.surfaceDarkest, depth)})`;

const PAGE_LIGHTS = Object.freeze({
  none: null,
  // vignette: the page's corners lost in the dark, under a film's grain: a
  // scene that keeps behind the panels.
  vignette: [
    darkCorners(34, OPACITY.heavy),
    GRAIN,
  ].join(', '),
  // smoke: no light but what the smoke catches — banks of it drifting low
  // across the page, its corners lost in the dark, under a film's grain.
  smoke: [
    darkCorners(28, OPACITY.veil),
    GRAIN,
    `radial-gradient(60% 34% at 16% 80%, ${uiAlpha(UI_COLORS.textMuted, OPACITY.fill)}, transparent 72%)`,
    `radial-gradient(70% 28% at 84% 60%, ${uiAlpha(UI_COLORS.textMuted, OPACITY.tint)}, transparent 72%)`,
    `radial-gradient(95% 24% at 46% 100%, ${uiAlpha(UI_COLORS.textMuted, OPACITY.shade)}, transparent 76%)`,
  ].join(', '),
  blinds: [
    `radial-gradient(95% 85% at 22% 10%, transparent 12%, ${UI_COLORS.page} 80%)`,
    GRAIN,
    `repeating-linear-gradient(-24deg, ${uiAlpha(UI_COLORS.accentHighlight, OPACITY.soft)} 0 18px, transparent 18px 47px)`,
  ].join(', '),
});

export const PAGE_LIGHT_KINDS = Object.freeze(Object.keys(PAGE_LIGHTS));

// A layer held still behind every screen (the style's scene, the light it
// throws on its page: theme.js), the whole window's size. Its own layer for
// the graphics card (will-change): painted once and kept, where the page
// would otherwise paint it again at every step of a scroll.
export const FIXED_PAGE_LAYER = Object.freeze({
  content: '""', position: 'fixed', inset: 0, zIndex: -1, pointerEvents: 'none', willChange: 'transform',
});

// The page's light as the layer the theme lays behind the app (theme.js);
// null where the style throws none.
export function pageLightSx(kind) {
  const light = PAGE_LIGHTS[kind];
  if (!light) return null;
  return { ...FIXED_PAGE_LAYER, backgroundImage: light };
}

// The badge an icon stands on (shapes.js panel.badge): a seal in the panel's
// tone with the ink on it, or the drawing bare in the tone.
const BADGES = Object.freeze({
  seal: () => ({ fill: 'initial', ink: UI_COLORS.onFill, edge: INK_EDGE, shadow: UI_SHADOWS.box }),
  bare: () => ({ fill: 'transparent', ink: 'initial', edge: 'none', shadow: 'none' }),
});

export const BADGE_KINDS = Object.freeze(Object.keys(BADGES));

// How the style builds a panel (shapes.js panel), as whole values the panel's
// recipes read (PanelHeader.jsx, SURFACES.panel): the comic's own values where
// the style builds as the comic does, so its panels are drawn exactly as they
// were. A variable set to `initial` is unset: its recipe falls back to the
// panel's tone.
function panelVariables(panel) {
  const badge = (BADGES[panel.badge] || BADGES.seal)();
  const reaches = panel.grip !== 'none' || bannerReach(panel.banner) > 0;
  const float = (solid, fall, blur) => (panel.float ? `${solid}, ${panelFloatShadow(panel.float, fall, blur)}` : solid);
  return {
    // The bar: the header's paper, or none over a rule in the panel's tone.
    '--gb-panel-bar-paper': panel.bar === 'fill' ? UI_COLORS.surfaceHeader : 'transparent',
    '--gb-panel-bar-rule': panel.bar === 'rule' ? 'initial' : UI_COLORS.edge,
    '--gb-panel-bar-hatch': panel.hatch ? 'auto' : '0 0',
    // The badge (BADGES).
    '--gb-panel-badge-fill': badge.fill,
    '--gb-panel-badge-ink': badge.ink,
    '--gb-panel-badge-edge': badge.edge,
    '--gb-panel-badge-shadow': badge.shadow,
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
// results): the sunken well, its height capped at `maxHeight`. No cap (0,
// none) lets it grow to fit: a 0px cap would hide every row.
export function scrollWellSx(maxHeight) {
  return { ...SURFACES.inset, ...(maxHeight ? { maxHeight } : {}), overflow: 'auto' };
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
    // Shaded as the style lights its boxes (SURFACE_FINISHES).
    backgroundImage: surfaceFinish('box'),
    border: INK_EDGE,
    borderRadius: 1,
    // Its solid shadow, and a soft one as the style floats its panels.
    boxShadow: 'var(--gb-panel-box-shadow)',
  }),
  // A card inside a panel: the drawn edge, lifted a little off the panel
  // (interactive.js CARD_SX lights it under the cursor).
  card: Object.freeze({
    bgcolor: 'background.paper',
    backgroundImage: surfaceFinish('box'),
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
    // Shaded inside as deep as the style sinks its wells.
    boxShadow: wellShadow('var(--Paper-shadow)'),
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
    backgroundImage: surfaceFinish('box', 'none'),
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
