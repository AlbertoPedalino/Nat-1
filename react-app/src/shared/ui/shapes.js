// The interface's cut shapes, every one in this file: a panel bar's ribbon,
// the wax seal an icon stands on, the ability scores' crest, a tab's bookmark,
// the gems' cuts, the segments of a meter, the bursts behind a roll that
// shouts, a switch, a slider's thumb, the ornament on a card's rule, the
// bookmark that marks a chosen row, the focus ring, the marks of a checkbox
// and a radio and the die on a dice formula. With
// the palette (colors.js, entityColors.js), the type (fonts.js,
// textStyles.js), the ink (shadows.js) and the drawings (gameIcons.js) this
// is the whole look. The components that draw them (PanelHeader, StatTile,
// GemPip, SegmentedMeter, bubble.js, CountSeal, CardSection, the theme's
// tabs, switches and sliders) hold no shape of their own (guarded).
//
// The viewer chooses a style (SHAPE_STYLES, the account menu's "Style"), apart
// from the palette, and every style cuts the same shapes its own way: a new
// style is one more entry below, with the same keys as COMIC (guarded). As a
// palette's roles are, a shape that is a CSS value is the chosen style's CSS
// variable (SEAL_RADIUS is `var(--gb-shape-seal-radius)`), written on the
// page's root with the palette (shapeVariables); a shape worked out in code
// (a gem's facets, a meter's cuts, a burst's spikes, a picture's path) is
// read from the style itself (styleShapes, useStyleShapes in themeIds.js), or
// drawn per style as a picture (svgStylePicture).

// The comic cut: inked, hand-pressed and bold.
const COMIC = deepFreeze({
  // A panel bar's ribbon: each end notched in a swallowtail `notch` px deep,
  // the ends widened by `pad` px to clear it. A stat tile's is shallower and
  // slimmer, so its name (Armor Class, Inspiration) keeps the room.
  ribbon: {
    panel: { notch: 10, pad: 18 },
    tile: { notch: 4, pad: 5 },
  },
  // A wax seal's edge: round, but not perfectly, as if pressed by hand. The
  // badge an icon stands on (a panel's, a tool's on the home page) takes it.
  seal: { radius: '46% 54% 48% 52% / 55% 45% 55% 45%' },
  // The ability scores' crest: square shoulders, a point at the foot. `edge`
  // is its ink (px), `foot` the room its figures keep clear of the point (a
  // share of the crest's width).
  crest: {
    clip: 'polygon(0 0, 100% 0, 100% 80%, 50% 100%, 0 80%)',
    edge: 3,
    foot: '22%',
  },
  // A tab is a notebook's bookmark: rounded at the top, open at the foot where
  // it stands on its bar's ruled line; the open one rises by `rise` px. `gap`
  // spaces the bookmarks.
  bookmarkTab: { radius: '8px 8px 0 0', rise: 4, gap: 4 },
  // The gems' cuts, in a 100-unit box: `sides`, the outline and the table
  // (the flat top facet) as centre x, centre y, radius x, radius y — the table
  // set up and left so the facets round it catch the light unevenly — and how
  // far the solid shadow drops. A counter's gem (a slot, a use, a hit die) is
  // a hexagon; a training mark's (a skill's, a save's) a four-sided diamond,
  // so a mark that is read never looks like a gem that is spent.
  gemCuts: {
    counter: { sides: 6, outer: [50, 46, 44, 45], inner: [47, 43, 23, 23.5], shadowDrop: 6 },
    training: { sides: 4, outer: [50, 46, 38, 46], inner: [47, 42, 17, 21], shadowDrop: 6 },
  },
  // How many segments a meter is cut into: a bar on a page, a piece's bar a
  // few pixels tall on the map, none for a smooth strip (XP).
  meterSegments: { bar: 10, piece: 5, smooth: 0 },
  // The bursts behind a total that shouts (bubble.js). The natural 20's KAPOW:
  // `width` units wide by 100 tall, squashed by `squash`, sharp spikes of a few
  // lengths each leaning a little ([angle, reach, lean] in degrees and units),
  // valleys of a few depths. The natural 1's crash: six arms of different reach
  // ([angle, reach]), each kinked along its trailing edge ([share of reach,
  // degrees off]), round a full `middle` the number sits inside.
  bursts: {
    kapow: {
      width: 130,
      squash: 0.78,
      spikes: [[-90, 64, 4], [-62, 52, -3], [-38, 62, 5], [-14, 50, 0], [8, 60, -4], [32, 54, 3], [58, 63, 6], [84, 50, -2], [108, 61, 4], [134, 53, -5], [158, 64, 3], [182, 51, 0], [206, 62, -4], [232, 52, 4]],
      valleys: [37, 40, 36, 39, 38, 35, 40, 37, 39, 36, 38, 40, 36, 39],
    },
    crash: {
      arms: [[-85, 48], [-20, 42], [40, 47], [110, 40], [170, 48], [235, 43]],
      kinks: [[0.74, 8], [0.84, 13]],
      middle: 33,
    },
  },
  // An on/off switch (every ToggleRow): a rounded track `width` by `height`
  // px, a round thumb `thumb` px across set `inset` px inside it, sliding across.
  switch: { width: 46, height: 28, thumb: 18, inset: 5 },
  // A slider's thumb (every LabeledSlider): a wax seal `size` px across, the
  // seal's own edge.
  sliderThumb: { size: 18 },
  // The ornament set on the middle of a card's rule (CardSection): a small
  // diamond, as a printed rulebook sets a fleuron between its parts. `path`
  // is drawn in an ORNAMENT_BOX px box.
  ornament: { path: 'M6 0 L12 6 L6 12 L0 6 Z' },
  // The bookmark on the left edge of a chosen row and of a menu item under the
  // pointer, as a tab's: `width` px, `inset` px from the row's top and foot.
  bookmarkMark: { width: 5, inset: 4, radius: '0 4px 4px 0' },
  // A sheet of paper laid on the interface (SURFACES.paper): its corners cut
  // unevenly as a torn-out page's, in theme radius units (top left, top right,
  // bottom right, bottom left).
  paper: { corners: [0.75, 1.75, 0.75, 1.75] },
  // The keyboard's focus: a gold ring `width` px round what has it, set `gap`
  // px off, with the ink shadow widened round it.
  focusRing: { width: 3, gap: 2 },
  // A checkbox's box and a radio's seal (ChoiceMarks): `size` px across.
  choiceMark: { size: 20 },
  // The die drawn before a dice formula in the text ("8d6"): a hexagon, `path`
  // in a DIE_GLYPH_BOX px box.
  dieGlyph: { path: 'M6 0.5 L11.5 3.5 L11.5 8.5 L6 11.5 L0.5 8.5 L0.5 3.5 Z' },
  // The ink (shadows.js): `edge` the px width of the line round every drawn
  // box and control (every other inked line, a lettering's outline or a
  // bubble's, scales with it); `drop` how far every solid shadow falls, as a
  // share of the comic one (0: a flat style, no solid shadows); `depth` the
  // same for the soft shadows under what floats; `glow` how far (px) every
  // solid shadow and inked lettering blurs out round itself, a lit line's
  // halo (0: a hard drawn shadow).
  ink: { edge: 2, drop: 1, depth: 1, glow: 0 },
  // The theme's corner radius, px: every `borderRadius: n` in sx is n times it.
  radius: 10,
  // The surfaces' textures (surfaces.js): `paper` the drawings over the page
  // ('stickers', the game's things as stickers: stickerPaper.js; 'none'); the
  // page's `halftone` dots (`dot` px across, every `step` px; null for none);
  // the `screentone` hatching of a panel's bar (`line` px of every `gap` px,
  // at `angle` degrees; a line of 0 for none); and how strongly a title's
  // cover `rays` shine (0–1).
  surface: {
    paper: 'stickers',
    halftone: { dot: 1, step: 7 },
    screentone: { line: 2, gap: 7, angle: -45 },
    rays: 1,
  },
  // How the interface moves (motion.js): `pace` scales every transition's and
  // animation's time (0: none at all), `hop` how far a pressed thing hops up
  // under the cursor and squashes when pressed (pressable.js; 0: it stays put).
  motion: { pace: 1, hop: 1 },
});

// The sci-fi cut: a ship's console. Chamfered, near-square corners, thin lit
// lines that glow instead of solid shadows, diamond gems, an octagonal crest,
// scanlines over the bars and a grid of points over the page, quick moves
// with no hop. Made to test that a style changing every piece carries.
const SCIFI = deepFreeze({
  // Straight bars: no swallowtail.
  ribbon: {
    panel: { notch: 0, pad: 12 },
    tile: { notch: 0, pad: 4 },
  },
  seal: { radius: '4px' },
  crest: {
    clip: 'polygon(12% 0, 88% 0, 100% 14%, 100% 86%, 88% 100%, 12% 100%, 0 86%, 0 14%)',
    edge: 1,
    foot: '8%',
  },
  bookmarkTab: { radius: '3px 3px 0 0', rise: 2, gap: 2 },
  gemCuts: {
    counter: { sides: 4, outer: [50, 46, 40, 44], inner: [48, 44, 18, 20], shadowDrop: 0 },
    training: { sides: 3, outer: [50, 52, 40, 40], inner: [50, 54, 16, 16], shadowDrop: 0 },
  },
  meterSegments: { bar: 20, piece: 8, smooth: 0 },
  bursts: {
    kapow: {
      width: 120,
      squash: 0.7,
      spikes: [[-90, 62, 0], [-45, 58, 0], [0, 62, 0], [45, 58, 0], [90, 62, 0], [135, 58, 0], [180, 62, 0], [225, 58, 0]],
      valleys: [30, 30, 30, 30, 30, 30, 30, 30],
    },
    crash: {
      arms: [[-90, 46], [-30, 46], [30, 46], [90, 46], [150, 46], [210, 46]],
      kinks: [[0.7, 0], [0.85, 0]],
      middle: 30,
    },
  },
  switch: { width: 44, height: 22, thumb: 14, inset: 4 },
  sliderThumb: { size: 16 },
  ornament: { path: 'M3 0 L9 0 L12 6 L9 12 L3 12 L0 6 Z' },
  bookmarkMark: { width: 3, inset: 2, radius: '0' },
  paper: { corners: [0.5, 0.5, 0.5, 0.5] },
  focusRing: { width: 2, gap: 2 },
  choiceMark: { size: 18 },
  dieGlyph: { path: 'M6 0.5 L11.5 6 L6 11.5 L0.5 6 Z' },
  ink: { edge: 1, drop: 0, depth: 1.5, glow: 6 },
  radius: 3,
  surface: {
    paper: 'none',
    halftone: { dot: 1, step: 22 },
    screentone: { line: 1, gap: 4, angle: 0 },
    rays: 0.6,
  },
  motion: { pace: 0.7, hop: 0 },
});

// The looks' styles the viewer can choose from (the "Style" of the account
// menu's theme panel), each with the palette it is drawn in for each mode
// (`palettes`: dark and light, ids of colors.js PALETTES).
export const SHAPE_STYLES = Object.freeze({
  comic: Object.freeze({ id: 'comic', label: 'Comic', palettes: Object.freeze({ dark: 'dark', light: 'light' }), shapes: COMIC }),
  scifi: Object.freeze({ id: 'scifi', label: 'Sci-fi', palettes: Object.freeze({ dark: 'neon', light: 'neonLight' }), shapes: SCIFI }),
});

export const BASE_STYLE_ID = 'comic';

// A style's shapes, the base style's for an unknown id.
export function styleShapes(styleId) {
  return (SHAPE_STYLES[styleId] || SHAPE_STYLES[BASE_STYLE_ID]).shapes;
}

// The boxes the ornament's and the die glyph's paths are drawn in, px: a
// layout size, the same in every style.
export const ORNAMENT_BOX = 12;
export const DIE_GLYPH_BOX = 12;

// The shapes that are CSS values, as the chosen style's variables: what a
// recipe writes in sx, in the theme's overrides or in a constant made once.
const shapeVariable = (name) => `var(--gb-shape-${name})`;

export const RIBBON = Object.freeze({
  panel: Object.freeze({ notch: shapeVariable('ribbon-panel-notch'), pad: shapeVariable('ribbon-panel-pad') }),
  tile: Object.freeze({ notch: shapeVariable('ribbon-tile-notch'), pad: shapeVariable('ribbon-tile-pad') }),
});

// The ribbon's cut for a notch `notch` deep (a CSS length): a swallowtail at each end.
export function ribbonClip(notch) {
  return `polygon(0 0, 100% 0, calc(100% - ${notch}) 50%, 100% 100%, 0 100%, ${notch} 50%)`;
}

export const SEAL_RADIUS = shapeVariable('seal-radius');

export const CREST = Object.freeze({
  clip: shapeVariable('crest-clip'),
  edge: shapeVariable('crest-edge'),
  foot: shapeVariable('crest-foot'),
});

export const FOCUS_RING = Object.freeze({
  width: shapeVariable('focus-width'),
  gap: shapeVariable('focus-gap'),
});

export const CHOICE_MARK = Object.freeze({ size: shapeVariable('choice-mark') });

// A burst's box is as wide as its shape for the height it is drawn at
// (bubble.js): its width over its height.
export const BURST_ASPECT = Object.freeze({
  kapow: shapeVariable('kapow-aspect'),
  crash: shapeVariable('crash-aspect'),
});

// The meters' kinds of cut (SegmentedMeter's `segments`), counted by the style.
export const METER_SEGMENTS = Object.freeze({ bar: 'bar', piece: 'piece', smooth: 'smooth' });

// The variables a style fills, { '--gb-shape-seal-radius': '46% …', … }, its
// ink's (`--gb-ink-*`, read by shadows.js) with them: written on the page's
// root with the palette's (ThemeChoiceProvider).
export function shapeVariables(styleId) {
  const shapes = styleShapes(styleId);
  return {
    '--gb-shape-ribbon-panel-notch': `${shapes.ribbon.panel.notch}px`,
    '--gb-shape-ribbon-panel-pad': `${shapes.ribbon.panel.pad}px`,
    '--gb-shape-ribbon-tile-notch': `${shapes.ribbon.tile.notch}px`,
    '--gb-shape-ribbon-tile-pad': `${shapes.ribbon.tile.pad}px`,
    '--gb-shape-seal-radius': shapes.seal.radius,
    '--gb-shape-crest-clip': shapes.crest.clip,
    '--gb-shape-crest-edge': `${shapes.crest.edge}px`,
    '--gb-shape-crest-foot': shapes.crest.foot,
    '--gb-shape-focus-width': `${shapes.focusRing.width}px`,
    '--gb-shape-focus-gap': `${shapes.focusRing.gap}px`,
    '--gb-shape-choice-mark': `${shapes.choiceMark.size}px`,
    '--gb-shape-kapow-aspect': String(shapes.bursts.kapow.width / 100),
    '--gb-shape-crash-aspect': '1',
    '--gb-ink-edge': `${shapes.ink.edge}px`,
    '--gb-ink-line': String(shapes.ink.edge / COMIC.ink.edge),
    '--gb-ink-drop': String(shapes.ink.drop),
    '--gb-ink-depth': String(shapes.ink.depth),
    '--gb-ink-glow': `${shapes.ink.glow}px`,
    '--gb-screentone-line': `${shapes.surface.screentone.line}px`,
    '--gb-screentone-gap': `${shapes.surface.screentone.gap}px`,
    '--gb-screentone-angle': `${shapes.surface.screentone.angle}deg`,
    '--gb-surface-rays': String(shapes.surface.rays),
    '--gb-motion-pace': String(shapes.motion.pace),
    '--gb-motion-hop': String(shapes.motion.hop),
  };
}

function deepFreeze(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}
