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
// The viewer chooses a style (SHAPE_STYLES, the theme panel's styles), apart
// from the palette, and every style cuts the same shapes its own way: a new
// style is one more entry below, with the same keys as COMIC (guarded). As a
// palette's roles are, a shape that is a CSS value is the chosen style's CSS
// variable (SEAL_RADIUS is `var(--gb-shape-seal-radius)`), written on the
// page's root with the palette (shapeVariables); a shape worked out in code
// (a gem's facets, a meter's cuts, a burst's spikes, a picture's path) is
// read from the style itself (styleShapes, useStyleShapes in themeIds.js), or
// drawn per style as a picture (svgStylePicture).

// The comic counter: a hexagonal gem, for a slot and a use alike.
const HEXAGON_GEM = { sides: 6, outer: [50, 46, 44, 45], inner: [47, 43, 23, 23.5], shadowDrop: 6 };

// The sci-fi counter: a power cell, for a slot and a use alike.
const POWER_CELL = {
  outline: 'M42 4 H58 V12 H62 Q70 12 70 20 V86 Q70 94 62 94 H38 Q30 94 30 86 V20 Q30 12 38 12 H42 Z',
  shading: [
    ['table', 'M37 22 H63 V42 H37 Z'],
    ['table', 'M37 46 H63 V64 H37 Z'],
    ['table', 'M37 68 H63 V86 H37 Z'],
  ],
  glint: false,
  centre: [50, 50],
  shadowDrop: 0,
};

// The comic cut: inked, hand-pressed and bold.
const COMIC = deepFreeze({
  // The speech bubble (bubble.js, bubbleLooks.js): its `fill` role, the `ink` its text is written in (the palette's text, or a paper's), its
  // `texture`, a drawn `frame` or none, its `radius` ('theme': two of the
  // style's units), `border` and `outline`, `tilt` (degrees), `shadow`, `tail` (drawn only where it speaks from something) and a `decor`
  // drawn on it. The comic's: a
  // speech balloon, inked thick, a little askew, a solid shadow, an inked triangle for a tail.
  bubble: {
    fill: 'bubble',
    ink: 'textPrimary',
    texture: 'plain',
    frame: 'none',
    radius: 'theme',
    border: { width: 3, style: 'solid', role: 'edge' },
    outline: { width: 0, offset: 0, role: 'edge' },
    tilt: -0.8,
    shadow: 'ink',
    tail: { kind: 'triangle', fill: 'bubble', line: 'edge' },
    decor: 'none',
  },
  // A panel bar's ribbon: each end notched in a swallowtail `notch` px deep,
  // the ends widened by `pad` px to clear it. A stat tile's is shallower and
  // slimmer, so its name (Armor Class, Inspiration) keeps the room. `ends`
  // is how each end is cut, the left end's edge from top to foot as points in
  // a box `notch` wide by 100 tall (x 0 the bar's edge, 10 the notch's
  // depth), the right end its mirror: the comic's swallowtail, a style's own
  // cut (a spear point, a scroll's roll, a pixel stair; a straight edge when
  // its bar is a plate or a rule).
  ribbon: {
    panel: { notch: 10, pad: 18 },
    tile: { notch: 4, pad: 5 },
    ends: '0,0 10,50 0,100',
  },
  // A wax seal's edge: round, but not perfectly, as if pressed by hand. The
  // badge an icon stands on (a panel's, a tool's on the home page) takes it.
  seal: { radius: '46% 54% 48% 52% / 55% 45% 55% 45%' },
  // The ability scores' crest: square shoulders, a point at the foot. `edge`
  // is its ink (px), `foot` the room its figures keep clear of the point and
  // `side` of the crest's sides (shares of the crest's width). Every style
  // cuts its own, the figures always inside.
  crest: {
    clip: 'polygon(0 0, 100% 0, 100% 80%, 50% 100%, 0 80%)',
    edge: 3,
    foot: '22%',
    side: '0%',
  },
  // How the six ability scores stand (StatTile.jsx, AbilityScores.jsx): their
  // `drawing`, each score a drawn thing of its own in place of the crest's cut
  // (abilityDrawing.js: 'headstones'; 'none' for the crest), and their
  // `figures`: the score beside the modifier its check rolls ('split'), or
  // the modifier large over the score ('stacked').
  abilities: { drawing: 'none', figures: 'split' },
  // What a roll's toast is written on (DiceToast.jsx): the style's speech
  // bubble (`drawing: 'none'`), or one drawn thing in its place
  // (toastDrawing.js: 'tombstone'), which shows a natural 20 and a natural 1
  // its own way.
  rollToast: { drawing: 'none' },
  // What an app notice is written on (AppToast.jsx): the style's speech bubble
  // (`drawing: 'none'`), or one drawn thing in its place (noticeDrawing.js:
  // 'sealed', 'clipping', 'tin'), in the notice's colour and with its mark.
  notice: { drawing: 'none' },
  // A tab is a notebook's bookmark: rounded at the top, open at the foot where
  // it stands on its bar's ruled line; the open one rises by `rise` px. `gap`
  // spaces the bookmarks.
  bookmarkTab: { radius: '8px 8px 0 0', rise: 4, gap: 4 },
  // The gems' cuts, in a 100-unit box: `sides`, the outline and the table
  // (the flat top facet) as centre x, centre y, radius x, radius y — the table
  // set up and left so the facets round it catch the light unevenly — and how
  // far the solid shadow drops. Three cuts: `counter` for a spell's slot (a
  // pact slot, a temporary one) and a hit die, `uses` for a feature's uses,
  // `training` for a skill's or a save's training mark. The comic counter and
  // uses are one hexagon, told apart by their colours (GemPip GEM_TONES); its
  // training mark a four-sided diamond, so a mark that is read never looks
  // like a gem that is spent. A style may draw a token of its own instead of
  // a cut gem (GOTHIC's drop of blood): `outline` an SVG path, `shading` its
  // lit and shaded parts ([shade, path], the shades of GemPip: light, dark,
  // table; or a palette role, for a part that keeps a colour of its own),
  // `glint` whether the comic glint shines on it, `centre` the point its spent
  // setting shrinks to; and, where it has them, `spent`, what is left of it
  // once spent (parts drawn in place of the bare setting), and `expert`, what
  // marks an expert on a training mark. Or the counter or the training mark
  // is not a gem at all but drawn by the hand-drawing kit (`drawing`,
  // counterDrawing.js: WAR's rounds, its tally in chalk), its `tones` then
  // the role each kind it counts (or `training`) is drawn in, every one
  // named. Either may bring `tones`, a palette
  // role by what it counts (GEM_TONES' kinds; `training` for a training mark,
  // then one colour at every level), over the colour GemPip gives it: blood is
  // red, brass a cartridge's. A style's counter and uses must differ in
  // their cut or in every colour.
  gemCuts: {
    counter: HEXAGON_GEM,
    uses: HEXAGON_GEM,
    training: { sides: 4, outer: [50, 46, 38, 46], inner: [47, 42, 17, 21], shadowDrop: 6 },
  },
  // How many segments a meter is cut into: a bar on a page, a piece's bar a
  // few pixels tall on the map, none for a smooth strip (XP).
  meterSegments: { bar: 10, piece: 5, smooth: 0 },
  // A natural 20's and a natural 1's moment (rollMoment.js): the `burst`
  // drawn behind the total that shouts, in its `fill` role, painted in a
  // technique (`paint`) and turned `turn` degrees; how the total is lettered
  // on it (`number`); how the roll's bubble moves (`motion`, bubble.js
  // BUBBLE_MOTIONS); and the particles drawn round it (`effect`,
  // momentParticles.js, RollMomentEffect.jsx). A burst is of a
  // `kind` (rollMoment.js BURSTS), drawn in a box `width` units wide (100
  // where it gives none) by 100 tall. The comic's: the natural 20's KAPOW, squashed by `squash`, sharp
  // spikes of a few lengths each leaning a little ([angle, reach, lean] in
  // degrees and units), valleys of a few depths; the natural 1's crash, six
  // arms of different reach ([angle, reach]), each kinked along its trailing
  // edge ([share of reach, degrees off]), round a full `middle` the number
  // sits inside; the bubble cheers on a 20 and groans on a 1, sparkling and
  // seeing stars (particles: sparkles popping, stars circling).
  moments: {
    nat20: {
      // KAPOW, a spring, sparkles all round.
      burst: {
        kind: 'kapow',
        width: 130,
        squash: 0.78,
        spikes: [[-90, 64, 4], [-62, 52, -3], [-38, 62, 5], [-14, 50, 0], [8, 60, -4], [32, 54, 3], [58, 63, 6], [84, 50, -2], [108, 61, 4], [134, 53, -5], [158, 64, 3], [182, 51, 0], [206, 62, -4], [232, 52, 4]],
        valleys: [37, 40, 36, 39, 38, 35, 40, 37, 39, 36, 38, 40, 36, 39],
      },
      fill: 'accent',
      paint: 'comic',
      number: 'ink',
      turn: -8,
      motion: 'cheer',
      effect: { glyph: 'sparkle', mode: 'pop', count: 8, size: [18, 30], colors: ['accentHighlight', 'spell', 'accent'], look: 'ink' },
    },
    nat1: {
      // A crash, a shake, stars circling the head.
      burst: {
        kind: 'crash',
        arms: [[-85, 48], [-20, 42], [40, 47], [110, 40], [170, 48], [235, 43]],
        kinks: [[0.74, 8], [0.84, 13]],
        middle: 33,
      },
      fill: 'dangerDeep',
      paint: 'comic',
      number: 'ink',
      turn: 14,
      motion: 'groan',
      effect: { glyph: 'star', mode: 'orbit', count: 3, size: [24, 24], colors: ['accent'], look: 'ink' },
    },
  },
  // An on/off switch (every ToggleRow): a rounded track `width` by `height`
  // px, a round thumb `thumb` px across set `inset` px inside it, sliding across.
  switch: { width: 46, height: 28, thumb: 18, inset: 5 },
  // A slider's thumb (every LabeledSlider): a wax seal `size` px across, the
  // seal's own edge.
  sliderThumb: { size: 18 },
  // The mark at the head of a card's name (ToneBar: an action's kind, an
  // item's rarity), in a 12 by 30 box: its `outline` filled in the kind's
  // colour; its lit and shaded faces (`light`, `shade`; a band down each side
  // where it has none); ink `lines` cut in it, a `cap` in its `capFill` role
  // (the ink where none), a `pupil`, a `glitch` slice shifted off it; a
  // `glow` round it; drawn on the pixel grid where `crisp`.
  // The ornament set on the middle of a card's rule (CardSection): a small
  // diamond, as a printed rulebook sets a fleuron between its parts. `path`
  // is drawn in an ORNAMENT_BOX px box.
  ornament: { path: 'M6 0 L12 6 L6 12 L0 6 Z' },
  marker: { outline: 'M6 1 L10.5 7 L10.5 23 L6 29 L1.5 23 L1.5 7 Z', light: 'M6 3 L5.5 26 L2.6 22.5 L2.6 7.5 Z', shade: 'M7.2 5 L9.4 8 L9.4 22 L7.2 25 Z' },
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
  // `lettering` how strongly titles and figures are inked (an outline and a
  // solid shadow, shadows.js inkLettering): 1 the comic's, 0 printed plain.
  ink: { edge: 2, drop: 1, depth: 1, glow: 0, lettering: 1 },
  // The light: how a style lights what the comic only inks, the comic's own
  // none of it (flat colour inside a drawn line). `finish` how a panel, a
  // box and what floats are shaded (surfaces.js SURFACE_FINISHES: 'flat' one
  // colour, 'lamp' lit from the upper left, 'glow' from overhead, 'ember'
  // from below, 'grime' dark in its corners); `page` the light thrown on the
  // page behind every screen (surfaces.js PAGE_LIGHTS: 'none', 'vignette',
  // 'blinds', 'smoke');
  // `soft` how strongly a soft shadow falls under whatever casts the ink's
  // solid one (a button, a card, a seal; 0: none), `bevel` how strongly its
  // top edge catches the light and its foot falls in shade (0: none), `well`
  // how deep what is sunken (a well, a field) is shaded inside (0: flat)
  // (shadows.js lightShadowVariables).
  light: { finish: 'flat', page: 'none', soft: 0, bevel: 0, well: 0 },
  // How a panel is built (PanelHeader.jsx): its title `bar` a filled strip
  // ('fill') or only a rule in the panel's tone under the title ('rule'),
  // `hatch` its screentone, the `frame` round it 'solid' or 'double' and
  // `frameWidth` px wide (the comic cut's, scaled with the ink), its icon on a
  // wax seal or 'bare', and how far it `float`s on a soft shadow (0: none,
  // the ink's solid shadow alone). Its title's `flourish`: an ornament drawn
  // on the bar (panelOrnaments.js: a line of stars, rivets, a vine, a
  // glitch) `width` by `height` px, at its `right` end or at both `ends`,
  // 'none' for none. What `grip`s it: a drawing over its top edge and down its
  // side, cut to its size (panelGrip.js: the abyssal's tentacle), 'none' for
  // none; a gripped panel lets it reach past its frame. Its title bar's
  // `banner`: the bar drawn as a ribbon, a scroll, a plate… across its width
  // with the title on it (panelBanner.js), 'none' for the bar as above. A stat
  // tile's narrow bar its `tileBanner` (panelBanner.js TILE_BANNERS: the war's
  // corrugated iron), 'none' for the bar as above.
  panel: {
    bar: 'fill', hatch: true, frame: 'solid', frameWidth: 3, badge: 'seal', float: 0,
    flourish: { kind: 'none', width: 0, height: 0, at: 'right' }, grip: 'none', banner: 'ribbon', tileBanner: 'none',
  },
  // The theme's corner radius, px: every `borderRadius: n` in sx is n times it.
  radius: 10,
  // The surfaces' textures (surfaces.js): `paper` the drawings over the page
  // ('stickers', the game's things as stickers: stickerPaper.js; a scene
  // drawn behind every screen, pageScenes.js: 'graveyard', 'tropics'…;
  // 'none'); the
  // page's `halftone` dots (`dot` px across, every `step` px; a dot of 0 for none);
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

// What every style lit rather than drawn (its `light`) lays the same way,
// having no ink to cut or to print with: named once, here.
//
// Its ink: a hairline for an edge, no solid shadow, its soft ones deep,
// lettering printed plain; a style adds its own glow or depth.
const LIT_INK = deepFreeze({ edge: 1, drop: 0, depth: 1.4, glow: 0, lettering: 0 });
// Its bar: no notch and no cut, a rule under its title, its ends straight.
const STRAIGHT_BAR = deepFreeze({ panel: { notch: 0, pad: 12 }, tile: { notch: 0, pad: 6 }, ends: '0,0 0,100' });
// Its panel: a hairline frame (`double`: two) on a soft shadow, no hatching
// and no flourish, its title drawn by its `banner` and, where a bar has none
// (a tab bar, a tile), set over a rule in the panel's tone; its icon bare,
// or on a `badge`; what `grip`s it.
const litPanel = ({ banner, badge = 'bare', grip = 'none', double = false, tileBanner = 'none' }) => ({
  bar: 'rule', hatch: false, frame: double ? 'double' : 'solid', frameWidth: double ? 6 : 2, badge, float: 1,
  flourish: COMIC.panel.flourish, grip, banner, tileBanner,
});
// Its page: `paper` behind every screen and nothing printed over it (no dots,
// no hatching, no rays).
const unprinted = (paper) => ({ paper, halftone: { dot: 0, step: 8 }, screentone: { line: 0, gap: 8, angle: 0 }, rays: 0 });

// The sci-fi cut: a ship's console. Chamfered, near-square corners, thin lit
// lines that glow, panels lit from overhead, a HUD plate for a panel's head,
// diamond gems, an octagonal crest, the planets behind every screen; quick
// moves with no hop.
const SCIFI = deepFreeze({
  // A console's panel: two corners cut, a lit line, corner brackets, scanlines, a glow, a leader line for a tail.
  bubble: {
    fill: 'bubble',
    ink: 'textPrimary',
    texture: 'scanlines',
    frame: 'chamfer',
    radius: 'theme',
    border: { width: 1, style: 'solid', role: 'edge' },
    outline: { width: 0, offset: 0, role: 'edge' },
    tilt: 0,
    shadow: 'glow',
    tail: { kind: 'leader', fill: 'edge', line: 'edge' },
    decor: 'brackets',
  },
  ribbon: STRAIGHT_BAR,
  seal: { radius: '4px' },
  crest: {
    clip: 'polygon(12% 0, 88% 0, 100% 14%, 100% 86%, 88% 100%, 12% 100%, 0 86%, 0 14%)',
    edge: 1,
    foot: '8%',
    side: '0%',
  },
  bookmarkTab: { radius: '3px 3px 0 0', rise: 2, gap: 2 },
  // A counter and a use are power cells, spent an empty socket, told apart by
  // their colours.
  gemCuts: {
    counter: POWER_CELL,
    uses: POWER_CELL,
    training: { sides: 3, outer: [50, 52, 40, 40], inner: [50, 54, 16, 16], shadowDrop: 0 },
  },
  meterSegments: { bar: 20, piece: 8, smooth: 0 },
  moments: {
    nat20: {
      // A targeting hexagon drawn as a hologram, radar rings.
      burst: { kind: 'notched', sides: 6, reach: 52, edge: 46, depth: 34, width: 115, squash: 0.87 },
      fill: 'accent',
      paint: 'hologram',
      number: 'glow',
      turn: 0,
      motion: 'materialize',
      effect: { glyph: 'ring', mode: 'ring', count: 3, size: [30, 30], colors: ['edge'], look: 'glow' },
    },
    nat1: {
      // A warning octagon split open, a glitch, short-circuit sparks.
      burst: { kind: 'polygon', points: [[31.6, 5.7], [68.4, 5.7], [94.3, 31.6], [85.6, 44.7], [94, 48.1], [72, 51.3], [89.3, 57.3], [94.3, 68.4], [68.4, 94.3], [31.6, 94.3], [5.7, 68.4], [5.7, 31.6]] },
      fill: 'danger',
      paint: 'hologram',
      number: 'glow',
      turn: 6,
      motion: 'glitch',
      effect: { glyph: 'spark', mode: 'fly', count: 9, size: [10, 16], colors: ['danger', 'edge'], look: 'glow' },
    },
  },
  switch: { width: 44, height: 22, thumb: 14, inset: 4 },
  sliderThumb: { size: 16 },
  ornament: { path: 'M3 0 L9 0 L12 6 L9 12 L3 12 L0 6 Z' },
  marker: { outline: 'M6 1.5 C9 1.5 10 3 10 5 V25 C10 27 9 28.5 6 28.5 C3 28.5 2 27 2 25 V5 C2 3 3 1.5 6 1.5 Z', lines: 'M3.5 10 H8.5 M3.5 15 H8.5 M3.5 20 H8.5', glow: true },
  bookmarkMark: { width: 3, inset: 2, radius: '0' },
  paper: { corners: [0.5, 0.5, 0.5, 0.5] },
  focusRing: { width: 2, gap: 2 },
  choiceMark: { size: 18 },
  dieGlyph: { path: 'M6 0.5 L11.5 6 L6 11.5 L0.5 6 Z' },
  abilities: COMIC.abilities,
  rollToast: COMIC.rollToast,
  notice: COMIC.notice,
  ink: { ...LIT_INK, depth: 1.5, glow: 6, lettering: 1 },
  light: { finish: 'glow', page: 'vignette', soft: 0.6, bevel: 0.4, well: 1 },
  panel: litPanel({ banner: 'hud' }),
  radius: 3,
  surface: unprinted('planets'),
  motion: { pace: 0.7, hop: 0 },
});

// What a gothic skull keeps whether there to spend or spent: its two sockets
// and its nose.
const SKULL_FACE = [
  'M22 45 A11 12 0 1 0 44 45 A11 12 0 1 0 22 45 Z',
  'M56 45 A11 12 0 1 0 78 45 A11 12 0 1 0 56 45 Z',
  'M50 58 L56 70 H44 Z',
];

// The gothic cut: the comic one in a haunted land. Deeper, tattered
// swallowtails, a headstone for the crest, seals like dripped wax, arched tabs, a
// cross for the ornament, torn paper; the comic ink, stickers and gems kept,
// moving a little slower.
const GOTHIC = deepFreeze({
  ...COMIC,
  // A pointed arch in a double thin line, a soft shadow, candle wax running off for a tail.
  bubble: {
    fill: 'bubble',
    ink: 'textPrimary',
    texture: 'arch',
    frame: 'none',
    radius: '50% 50% 4px 4px / 26px 26px 4px 4px',
    border: { width: 1.5, style: 'solid', role: 'accentText' },
    outline: { width: 1, offset: 3, role: 'accentMuted' },
    tilt: 0,
    shadow: 'soft',
    tail: { kind: 'drip', fill: 'accent', line: 'accent' },
    decor: 'none',
  },
  moments: {
    nat20: {
      // A rose window cut in wood, rising from the dark, bats scattering.
      burst: { kind: 'star', points: 12, reach: [54, 40, 46], inner: 28, width: 110, squash: 0.86 },
      fill: 'accent',
      paint: 'engraving',
      number: 'engrave',
      turn: -4,
      motion: 'loom',
      effect: { glyph: 'bat', mode: 'fly', count: 7, size: [22, 30], colors: ['spell', 'danger'], look: 'silhouette' },
    },
    nat1: {
      // Blood spattered and running, the bubble fainting, drops falling.
      burst: { kind: 'splat', base: 34, waves: [[5, 5], [11, 3, 30]], drips: [[70, 26, 9], [96, 34, 7], [122, 20, 8]] },
      fill: 'dangerDeep',
      paint: 'engraving',
      number: 'engrave',
      turn: 0,
      motion: 'faint',
      effect: { glyph: 'drop', mode: 'fall', count: 6, size: [12, 18], colors: ['danger', 'dangerDeep'], look: 'soft' },
    },
  },
  ribbon: {
    panel: { notch: 14, pad: 22 },
    tile: { notch: 5, pad: 6 },
    ends: '10,0 0,50 10,100',
  },
  seal: { radius: '42% 58% 50% 50% / 60% 44% 56% 40%' },
  // The ability scores are six headstones in a row, drawn by hand, the
  // modifier carved large over the score.
  abilities: { drawing: 'headstones', figures: 'stacked' },
  // A roll is carved on a tombstone: at a natural 20 roses climb its sides,
  // each on its own stem, at a natural 1 it splits and a black hand claws up
  // before it.
  rollToast: { drawing: 'tombstone' },
  // A notice is a strip of parchment, a seal of wax hanging from it.
  notice: { drawing: 'sealed' },
  // Their crest, where one is cut and not drawn, is a headstone too: a round
  // arch over a flat foot.
  crest: {
    clip: 'polygon(0 30%, 1.7% 22.2%, 6.7% 15%, 14.6% 8.8%, 25% 4%, 37.1% 1%, 50% 0, 62.9% 1%, 75% 4%, 85.4% 8.8%, 93.3% 15%, 98.3% 22.2%, 100% 30%, 100% 100%, 0 100%)',
    edge: 3,
    foot: '0%',
    side: '0%',
  },
  bookmarkTab: { radius: '10px 10px 0 0', rise: 4, gap: 4 },
  // A counter is a drop of blood (red for a spell's slot, the pact's violet),
  // spent a dried stain; a use a skull of pale bone, only its face left in the
  // dark once spent; a training mark a grave's cross.
  gemCuts: {
    counter: {
      outline: 'M50 4 C46 18 20 42 20 64 A30 30 0 0 0 80 64 C80 42 54 18 50 4 Z',
      shading: [
        ['dark', 'M62 36 C72 48 80 56 80 64 A30 30 0 0 1 52 94 C68 88 76 74 72 60 C70 52 66 44 62 36 Z'],
        ['light', 'M30 66 C30 56 36 46 42 38 C40 48 38 56 38 66 C38 72 34 74 32 72 C30 71 30 69 30 66 Z'],
      ],
      glint: false,
      centre: [50, 62],
      shadowDrop: 5,
      tones: { slot: 'danger' },
    },
    uses: {
      outline: 'M50 5 C26 5 11 21 11 43 C11 55 17 64 26 69 V85 C26 91 30 95 36 95 H64 C70 95 74 91 74 85 V69 C83 64 89 55 89 43 C89 21 74 5 50 5 Z',
      shading: [
        ['dark', 'M68 10 C80 17 89 29 89 43 C89 55 83 64 74 69 V85 C74 91 70 95 64 95 H56 C62 93 66 89 66 83 V65 C75 60 80 52 80 42 C80 29 76 18 68 10 Z'],
        // Its face and the gaps between the teeth, in the ink.
        ...SKULL_FACE.map((part) => ['edge', part]),
        ['edge', 'M41 82 H45 V95 H41 Z'],
        ['edge', 'M55 82 H59 V95 H55 Z'],
      ],
      spent: SKULL_FACE.map((part) => ['textFaint', part]),
      glint: false,
      centre: [50, 50],
      shadowDrop: 5,
      // Bone: the style's accent is blood's red.
      tones: { uses: 'paper' },
    },
    training: {
      outline: 'M36 2 H64 V22 H90 V48 H64 V98 H36 V48 H10 V22 H36 Z',
      shading: [
        ['dark', 'M54 2 H64 V22 H90 V48 H64 V98 H54 V40 H80 V30 H54 Z'],
        ['light', 'M36 2 H44 V30 H10 V22 H36 Z'],
      ],
      glint: false,
      centre: [50, 50],
      shadowDrop: 5,
    },
  },
  ornament: { path: 'M5 0 L7 0 L7 3 L10 3 L10 5 L7 5 L7 12 L5 12 L5 5 L2 5 L2 3 L5 3 Z' },
  marker: { outline: 'M4 1 H8 L11 9 L8.2 29 H3.8 L1 9 Z', lines: 'M6 6 V14 M3.8 8.5 H8.2' },
  paper: { corners: [0.3, 2, 0.5, 1.5] },
  panel: { ...COMIC.panel, banner: 'drape' },
  radius: 8,
  surface: {
    paper: 'graveyard',
    halftone: { dot: 1, step: 7 },
    screentone: { line: 2, gap: 6, angle: -45 },
    rays: 0.8,
  },
  motion: { pace: 1.15, hop: 0.8 },
});

// The war cut: a dugout at night, a war gone wrong. Lit, never drawn (as
// noir, on the light instead of the ink): plates and canvas gone dirty, the
// dark gathered in their corners, edged in a hairline of the mud's own olive;
// no light on the page but what the smoke catches, over the ruins; a title
// on a plate of rusted steel, its icon bare, no hatching, no rays; a dog tag for
// the crest, cartridges and grenades for the gems, a taped field form for a
// bubble; slow, wary moves, nothing hops.
const WAR = deepFreeze({
  // A typed field form on paper, taped on: square, ruled, lying straight, a paper corner for a tail.
  bubble: {
    fill: 'paper',
    ink: 'onPaper',
    texture: 'ruled',
    frame: 'none',
    radius: '2px',
    border: { width: 0, style: 'solid', role: 'edge' },
    outline: { width: 0, offset: 0, role: 'edge' },
    tilt: 0,
    shadow: 'ink',
    tail: { kind: 'paper', fill: 'paper', line: 'edge' },
    decor: 'tape',
  },
  ribbon: STRAIGHT_BAR,
  seal: { radius: '50%' },
  crest: {
    // A dog tag: rounded corners, the chain's notch in its side.
    clip: 'polygon(8% 0, 92% 0, 97% 3%, 100% 10%, 100% 90%, 97% 97%, 92% 100%, 8% 100%, 3% 97%, 0 90%, 0 62%, 4% 58%, 4% 42%, 0 38%, 0 10%, 3% 3%)',
    edge: 1,
    foot: '0%',
    side: '2%',
  },
  bookmarkTab: { radius: '6px 6px 0 0', rise: 3, gap: 3 },
  // A counter is a rifle round (counterDrawing.js), as in the belts over the
  // panels: live while it is there to spend, the spent case once spent; its
  // case in brass for a slot (never the olive of a use, in either palette),
  // steel for a pact's, green for a temporary one, red for a hit die. A use
  // is an olive grenade, an empty pouch once thrown. A training mark is a
  // tally in a warm chalk: a stroke rubbed out untrained, a stroke for half
  // proficiency, two for proficiency, the two struck through for expertise.
  gemCuts: {
    counter: { drawing: 'cartridge', tones: { slot: 'warning', pact: 'armor', temporary: 'success', hitDice: 'dangerText' } },
    uses: {
      outline: 'M24 62 A26 32 0 0 1 76 62 A26 32 0 0 1 24 62 Z M40 14 H60 V32 H40 Z M60 16 H68 C74 16 76 22 76 30 V46 L70 44 V28 C70 24 68 22 64 22 H60 Z',
      shading: [
        ['dark', 'M62 33.6 A26 32 0 0 1 62 90.4 C70 82 72 72 72 62 C72 52 70 42 62 33.6 Z'],
        ['dark', 'M25 56 H75 V60 H25 Z'],
        ['dark', 'M27 74 H73 V78 H27 Z'],
        ['dark', 'M48 31 H52 V93 H48 Z'],
        ['light', 'M32 48 C34 42 38 38 42 36 C40 42 38 46 38 52 Z'],
      ],
      glint: false,
      centre: [50, 60],
      shadowDrop: 4,
      tones: { uses: 'secondary' },
    },
    training: { drawing: 'tally', tones: { training: 'warningText' } },
  },
  meterSegments: { bar: 10, piece: 5, smooth: 0 },
  moments: {
    nat20: {
      // A rubber stamp in red ink, slammed down, shell casings flying.
      burst: { kind: 'polygon', width: 130, points: [[14, 10], [116, 10], [126, 20], [126, 80], [116, 90], [14, 90], [4, 80], [4, 20]] },
      fill: 'accent',
      paint: 'stamp',
      number: 'stamp',
      turn: -8,
      motion: 'stamp',
      effect: { glyph: 'casing', mode: 'fly', count: 7, size: [12, 16], colors: ['warning'], look: 'flat' },
    },
    nat1: {
      // A blast sprayed through a stencil, a shell-shock quake, smoke.
      burst: { kind: 'star', points: 11, reach: [40, 41, 61, 55, 51, 49, 50, 45, 52, 56, 46], inner: [22, 29, 26, 22, 24, 24, 26, 24, 32, 23, 31], lean: [-6, -7, -7, -4, 1, 5, -9, 8, 1, 2, 4], width: 120, squash: 0.8 },
      fill: 'dangerDeep',
      paint: 'stencil',
      number: 'stencil',
      turn: 4,
      motion: 'quake',
      effect: { glyph: 'puff', mode: 'rise', count: 7, size: [22, 34], colors: ['surface', 'bubble'], look: 'soft' },
    },
  },
  switch: { width: 46, height: 26, thumb: 16, inset: 5 },
  sliderThumb: { size: 18 },
  ornament: { path: 'M6 0 L7.4 4.1 L11.7 4.1 L8.2 6.7 L9.5 10.8 L6 8.3 L2.5 10.8 L3.8 6.7 L0.3 4.1 L4.6 4.1 Z' },
  // A card's mark is a drape of cloth hung by one corner, in the kind's colour (markerDrawing.js).
  marker: { drawing: 'drape' },
  bookmarkMark: { width: 4, inset: 3, radius: '0' },
  paper: { corners: [0, 0.4, 0, 0.8] },
  focusRing: { width: 3, gap: 2 },
  choiceMark: { size: 20 },
  dieGlyph: { path: 'M1.5 1.5 L10.5 1.5 L10.5 10.5 L1.5 10.5 Z' },
  // The ability scores are the soldiers' tags, in pairs, lying flat three to
  // a row: the score stamped beside the name, the modifier large under them.
  abilities: { drawing: 'tags', figures: 'stamped' },
  // A roll is a military telegram, half torn: its words typed on strips of
  // tape, a medal with it at a natural 20, a mourning edge and a stamp at a
  // natural 1.
  rollToast: { drawing: 'telegram' },
  // A notice is a strip of tin nailed up, a disc of paint in its colour.
  notice: { drawing: 'tin' },
  ink: { ...LIT_INK, depth: 1.5 },
  // Dirty plate under the smoke: the dark in every corner, a worn edge that
  // barely catches the light, whatever is sunken shaded deep.
  light: { finish: 'grime', page: 'smoke', soft: 1, bevel: 0.5, well: 1 },
  // A belt of rounds across the panel's head, its title on the belt's tab of
  // webbing; a stat tile's name on a sheet of corrugated iron.
  panel: litPanel({ banner: 'belt', tileBanner: 'corrugated' }),
  radius: 2,
  surface: unprinted('ruins'),
  motion: { pace: 1.2, hop: 0 },
});

// The astral cut: a wizard's tower under the stars. Glowing hairlines, panels
// in the moon's light from overhead, a night band between two crescents for
// a panel's head, moon seals, an orb for the crest, stars, moons and sparkles
// for the gems, the moonrise behind every screen; nothing hops.
const ASTRAL = deepFreeze({
  ...COMIC,
  // Night glass dusted with stars, a soft glow, three stars trailing for a tail.
  bubble: {
    fill: 'bubble',
    ink: 'textPrimary',
    texture: 'stardust',
    frame: 'none',
    radius: '16px',
    border: { width: 1, style: 'solid', role: 'accentMuted' },
    outline: { width: 0, offset: 0, role: 'edge' },
    tilt: 0,
    shadow: 'glow',
    tail: { kind: 'stars', fill: 'accent', line: 'accent' },
    decor: 'none',
  },
  moments: {
    nat20: {
      // A compass star of light, rising, a constellation lighting up.
      burst: { kind: 'star', points: 8, reach: [58, 34], inner: 14 },
      fill: 'accent',
      paint: 'starlight',
      // Inked: the star is white at its heart, where a lit number would vanish.
      number: 'ink',
      turn: 0,
      motion: 'ascend',
      effect: { glyph: 'star', mode: 'pop', count: 8, size: [10, 18], colors: ['accentText', 'spell', 'textPrimary'], look: 'glow' },
    },
    nat1: {
      // An eclipse, the light going out, shooting stars.
      burst: { kind: 'crescent', outer: [50, 50, 46], bite: [66, 42, 40] },
      fill: 'danger',
      paint: 'starlight',
      number: 'glow',
      turn: -18,
      motion: 'eclipse',
      effect: { glyph: 'ember', mode: 'fall', count: 5, size: [8, 12], colors: ['accentText', 'spell'], look: 'glow' },
    },
  },
  ribbon: STRAIGHT_BAR,
  seal: { radius: '50%' },
  crest: {
    // A plaque, its corners cut round inwards.
    clip: 'polygon(90% 0, 91.3% 8%, 95% 13.9%, 100% 16%, 100% 84%, 95% 86.1%, 91.3% 92%, 90% 100%, 10% 100%, 8.7% 92%, 5% 86.1%, 0 84%, 0 16%, 5% 13.9%, 8.7% 8%, 10% 0)',
    edge: 1,
    foot: '0%',
    side: '0%',
  },
  bookmarkTab: { radius: '14px 14px 0 0', rise: 3, gap: 3 },
  // A counter is a star (a gold one for a spell's slot), a use a silver
  // moon, a training mark a sparkle.
  gemCuts: {
    counter: {
      outline: 'M50 6 L61.8 36.8 L94.7 38.5 L69 59.2 L77.6 91 L50 73 L22.4 91 L31 59.2 L5.3 38.5 L38.2 36.8 Z',
      shading: [
        ['dark', 'M50 53 L94.7 38.5 L69 59.2 Z'],
        ['dark', 'M50 53 L77.6 91 L50 73 Z'],
        ['dark', 'M50 53 L22.4 91 L31 59.2 Z'],
        ['light', 'M50 53 L38.2 36.8 L50 6 Z'],
        ['light', 'M50 53 L31 59.2 L5.3 38.5 Z'],
      ],
      glint: false,
      centre: [50, 53],
      shadowDrop: 0,
      tones: { slot: 'warning' },
    },
    uses: {
      outline: 'M58 6 A44 44 0 1 0 94 66 A36 36 0 0 1 58 6 Z',
      shading: [
        ['dark', 'M30 86 A44 44 0 0 0 94 66 A36 36 0 0 1 52 80 Z'],
        ['light', 'M22 30 A44 44 0 0 1 40 12 A40 40 0 0 0 28 40 Z'],
      ],
      glint: false,
      centre: [44, 54],
      shadowDrop: 0,
      tones: { uses: 'armor' },
    },
    training: {
      outline: 'M50 4 L60 40 L96 50 L60 60 L50 96 L40 60 L4 50 L40 40 Z',
      shading: [
        ['dark', 'M50 50 L96 50 L60 60 L50 96 Z'],
        ['light', 'M50 50 L50 4 L40 40 L4 50 Z'],
      ],
      glint: false,
      centre: [50, 50],
      shadowDrop: 0,
    },
  },
  ornament: { path: 'M6 0 L7.2 4.8 L12 6 L7.2 7.2 L6 12 L4.8 7.2 L0 6 L4.8 4.8 Z' },
  marker: { outline: 'M6 0.5 Q7 12.5 11.5 15 Q7 17.5 6 29.5 Q5 17.5 0.5 15 Q5 12.5 6 0.5 Z', glow: true },
  bookmarkMark: { width: 4, inset: 4, radius: '0 6px 6px 0' },
  paper: { corners: [1, 1, 1, 1] },
  ink: { ...LIT_INK, glow: 4 },
  light: { finish: 'glow', page: 'vignette', soft: 1, bevel: 0.6, well: 1 },
  panel: litPanel({ banner: 'moons', double: true }),
  radius: 12,
  surface: unprinted('moonrise'),
  motion: { pace: 1.1, hop: 0 },
});

// The pirate cut: a captain's cabin by lantern. Lit, never drawn: panels in
// the lantern's light from the upper left, edged in a hairline, a parchment
// scroll for a panel's head, the tropics behind every screen; its crest,
// gems and marks its own, below; nothing hops.
const PIRATE = deepFreeze({
  ...COMIC,
  // A torn scrap of a stained sea chart, in sepia ink, a torn strip for a tail.
  bubble: {
    fill: 'paper',
    ink: 'onPaper',
    texture: 'stain',
    frame: 'torn',
    radius: 'theme',
    border: { width: 0, style: 'solid', role: 'edge' },
    outline: { width: 0, offset: 0, role: 'edge' },
    tilt: 0,
    shadow: 'drop',
    tail: { kind: 'torn', fill: 'paper', line: 'paper' },
    decor: 'none',
  },
  moments: {
    nat20: {
      // A ship's wheel on a sea chart, bobbing, gold doubloons tossed spinning.
      burst: { kind: 'lobes', base: 33, amp: 17, count: 8, power: 6 },
      fill: 'accent',
      paint: 'chart',
      number: 'engrave',
      turn: 11,
      motion: 'bob',
      effect: { glyph: 'doubloon', mode: 'toss', count: 7, size: [20, 26], colors: ['accent'], look: 'gold' },
    },
    nat1: {
      // A splash, capsizing and righting, air bubbles.
      burst: { kind: 'lobes', base: 34, amp: 22, count: 7, power: 3, top: true, flat: 0.78, width: 110 },
      fill: 'dangerDeep',
      paint: 'chart',
      number: 'engrave',
      turn: -6,
      motion: 'capsize',
      effect: { glyph: 'bubble', mode: 'rise', count: 8, size: [8, 16], colors: ['info'], look: 'soft' },
    },
  },
  ribbon: STRAIGHT_BAR,
  seal: { radius: '50%' },
  crest: {
    clip: 'polygon(4% 0, 96% 0, 100% 10%, 98% 50%, 100% 90%, 96% 100%, 4% 100%, 0 90%, 2% 50%, 0 10%)',
    edge: 1,
    foot: '0%',
    side: '0%',
  },
  bookmarkTab: { radius: '4px 4px 0 0', rise: 3, gap: 4 },
  // A counter is a doubloon, a use a bottle of rum, a training mark the X
  // that marks the spot.
  gemCuts: {
    counter: {
      outline: 'M8 50 A42 42 0 1 1 92 50 A42 42 0 1 1 8 50 Z',
      shading: [
        ['table', 'M22 50 A28 28 0 1 1 78 50 A28 28 0 1 1 22 50 Z'],
        ['dark', 'M46 34 H54 V46 H66 V54 H54 V66 H46 V54 H34 V46 H46 Z'],
      ],
      glint: true,
      centre: [50, 50],
      shadowDrop: 6,
      tones: { slot: 'accent' },
    },
    uses: {
      outline: 'M43 4 H57 V14 H55 V30 C55 36 72 40 72 54 V90 Q72 96 66 96 H34 Q28 96 28 90 V54 C28 40 45 36 45 30 V14 H43 Z',
      shading: [
        ['table', 'M28 60 H72 V80 H28 Z'],
        ['dark', 'M62 46 C68 48 72 50 72 54 V90 Q72 96 66 96 H62 Z'],
        ['light', 'M33 52 H37 V88 H33 Z'],
      ],
      glint: false,
      centre: [50, 60],
      shadowDrop: 6,
      tones: { uses: 'success' },
    },
    training: {
      outline: 'M14 4 L50 36 L86 4 L96 14 L64 50 L96 86 L86 96 L50 64 L14 96 L4 86 L36 50 L4 14 Z',
      shading: [
        ['dark', 'M50 50 L64 50 L96 86 L86 96 L50 64 Z'],
        ['light', 'M4 14 L14 4 L50 36 L36 50 Z'],
      ],
      glint: false,
      centre: [50, 50],
      shadowDrop: 6,
    },
  },
  ink: LIT_INK,
  light: { finish: 'lamp', page: 'vignette', soft: 1, bevel: 0.8, well: 1 },
  // Its icon on a seal: bare, a pale drawing is lost on the banner's light ground.
  panel: litPanel({ banner: 'scroll', badge: 'seal' }),
  ornament: { path: 'M1 0 L6 4.5 L11 0 L12 1 L7.5 6 L12 11 L11 12 L6 7.5 L1 12 L0 11 L4.5 6 L0 1 Z' },
  marker: { outline: 'M2 1 H10.5 V29 L6.2 23.5 L2 29 Z', lines: 'M2 1 V29' },
  paper: { corners: [1.5, 0.5, 2, 0.75] },
  radius: 6,
  surface: unprinted('tropics'),
  motion: { pace: 1, hop: 0 },
});

// The steampunk cut: the lower city by its furnaces. Lit, never drawn: plates
// warmed by a fire below, their heads in the dark, a double hairline frame,
// blackened iron between two brass pipes for a panel's head, the foundries
// behind every screen; its crest, gems and marks its own, below; nothing
// hops.
const STEAMPUNK = deepFreeze({
  ...COMIC,
  // A brass plate, bevelled and riveted, a bracket for a tail.
  bubble: {
    fill: 'bubble',
    ink: 'textPrimary',
    texture: 'arch',
    frame: 'plate',
    radius: 'theme',
    border: { width: 3, style: 'solid', role: 'accent' },
    outline: { width: 0, offset: 0, role: 'edge' },
    tilt: 0,
    shadow: 'drop',
    tail: { kind: 'bracket', fill: 'accent', line: 'edge' },
    decor: 'none',
  },
  moments: {
    nat20: {
      // A brass cog, wound up and sprung, steam.
      burst: { kind: 'gear', teeth: 12, outer: 50, inner: 41 },
      fill: 'accent',
      paint: 'brass',
      number: 'emboss',
      turn: 8,
      motion: 'windup',
      effect: { glyph: 'puff', mode: 'rise', count: 6, size: [20, 30], colors: ['textPrimary'], look: 'soft' },
    },
    nat1: {
      // A broken cog, sputtering and jamming, nuts flying off.
      burst: { kind: 'gear', teeth: 12, outer: 50, inner: 41, missing: [2, 3, 8], crack: 6 },
      fill: 'dangerDeep',
      paint: 'brass',
      number: 'emboss',
      turn: -10,
      motion: 'sputter',
      effect: { glyph: 'nut', mode: 'fly', count: 6, size: [12, 16], colors: ['accent', 'textSecondary'], look: 'flat' },
    },
  },
  ribbon: STRAIGHT_BAR,
  seal: { radius: '30%' },
  crest: {
    // A cartouche: a long plate pointed at each side.
    clip: 'polygon(7% 0, 93% 0, 100% 50%, 93% 100%, 7% 100%, 0 50%)',
    edge: 1,
    foot: '0%',
    side: '5%',
  },
  bookmarkTab: { radius: '2px 2px 0 0', rise: 2, gap: 3 },
  // A counter is a gear (brass for a spell's slot), a use an electric bulb,
  // a training mark a hex nut.
  gemCuts: {
    counter: {
      outline: 'M40.1 15.4 L42 3.7 L58 3.7 L59.9 15.4 L67.4 18.5 L77.1 11.6 L88.4 22.9 L81.5 32.6 L84.6 40.1 L96.3 42 L96.3 58 L84.6 59.9 L81.5 67.4 L88.4 77.1 L77.1 88.4 L67.4 81.5 L59.9 84.6 L58 96.3 L42 96.3 L40.1 84.6 L32.6 81.5 L22.9 88.4 L11.6 77.1 L18.5 67.4 L15.4 59.9 L3.7 58 L3.7 42 L15.4 40.1 L18.5 32.6 L11.6 22.9 L22.9 11.6 L32.6 18.5 Z',
      shading: [
        ['table', 'M28 50 A22 22 0 1 1 72 50 A22 22 0 1 1 28 50 Z'],
        ['dark', 'M42 50 A8 8 0 1 1 58 50 A8 8 0 1 1 42 50 Z'],
      ],
      glint: true,
      centre: [50, 50],
      shadowDrop: 5,
      tones: { slot: 'accent' },
    },
    uses: {
      outline: 'M50 4 A30 30 0 0 1 72 54 C66 62 62 66 62 72 H38 C38 66 34 62 28 54 A30 30 0 0 1 50 4 Z M38 76 H62 V84 H38 Z M42 88 H58 V96 H42 Z',
      shading: [
        ['light', 'M50 16 A18 18 0 0 1 64 44 C60 50 56 54 56 60 H44 C44 54 40 50 36 44 A18 18 0 0 1 50 16 Z'],
        ['dark', 'M54 76 H62 V84 H54 Z'],
        ['dark', 'M52 88 H58 V96 H52 Z'],
      ],
      glint: true,
      centre: [50, 40],
      shadowDrop: 5,
      tones: { uses: 'info' },
    },
    training: {
      outline: 'M50 6 L88 28 L88 72 L50 94 L12 72 L12 28 Z',
      shading: [
        ['dark', 'M50 50 L88 28 L88 72 L50 94 Z'],
        ['light', 'M50 50 L12 28 L50 6 Z'],
        ['dark', 'M38 50 A12 12 0 1 1 62 50 A12 12 0 1 1 38 50 Z'],
      ],
      glint: false,
      centre: [50, 50],
      shadowDrop: 5,
    },
  },
  meterSegments: { bar: 12, piece: 6, smooth: 0 },
  ink: LIT_INK,
  light: { finish: 'ember', page: 'vignette', soft: 1, bevel: 1, well: 1 },
  panel: litPanel({ banner: 'undercity', double: true }),
  ornament: { path: 'M4.6 1.8 L4.8 0.1 L7.2 0.1 L7.4 1.8 L8.9 2.7 L10.5 2 L11.7 4.1 L10.3 5.1 L10.3 6.9 L11.7 7.9 L10.5 10 L8.9 9.3 L7.4 10.2 L7.2 11.9 L4.8 11.9 L4.6 10.2 L3.1 9.3 L1.5 10 L0.3 7.9 L1.7 6.9 L1.7 5.1 L0.3 4.1 L1.5 2 L3.1 2.7 Z' },
  marker: { outline: 'M6 1 L11 6 V24 L6 29 L1 24 V6 Z', cap: 'M1 6 L6 1 L11 6 V8.5 H1 Z M1 21.5 H11 V24 L6 29 L1 24 Z', capFill: 'accent' },
  bookmarkMark: { width: 4, inset: 3, radius: '0' },
  paper: { corners: [0.3, 0.3, 0.3, 0.3] },
  radius: 4,
  surface: unprinted('foundries'),
  motion: { pace: 1.1, hop: 0 },
});

// The dwarven cut: a hall by the forge. Lit, never drawn: stone warmed by the
// fire below, edged in a hairline, a carved lintel for a panel's head, the
// caverns behind every screen; its crest, gems and marks its own, below;
// slow, nothing hops.
const DWARVEN = deepFreeze({
  ...COMIC,
  // A carved slab, every corner chiselled, grained, a stone wedge for a tail.
  bubble: {
    fill: 'surfaceRaised',
    ink: 'textPrimary',
    texture: 'grain',
    frame: 'slab',
    radius: 'theme',
    border: { width: 2, style: 'solid', role: 'edge' },
    outline: { width: 0, offset: 0, role: 'edge' },
    tilt: 0,
    shadow: 'drop',
    tail: { kind: 'wedge', fill: 'surfaceRaised', line: 'edge' },
    decor: 'none',
  },
  moments: {
    nat20: {
      // A rune shield in molten metal, struck like a hammer, forge sparks.
      burst: { kind: 'polygon', width: 110, points: [[32, 2], [78, 2], [102, 30], [94, 76], [55, 99], [16, 76], [8, 30]] },
      fill: 'accent',
      paint: 'molten',
      number: 'glow',
      turn: 0,
      motion: 'hammer',
      effect: { glyph: 'ember', mode: 'rise', count: 10, size: [6, 12], colors: ['accent', 'accentText', 'danger'], look: 'glow' },
    },
    nat1: {
      // A cracked boulder, crumbling, debris falling.
      burst: { kind: 'splat', base: 44, waves: [[3, 5, 20], [7, 3]], notches: [[-80, 0.7, 6]], steps: 60, rough: 3, seed: 'boulder' },
      fill: 'dangerDeep',
      paint: 'stone',
      number: 'engrave',
      turn: 0,
      motion: 'crumble',
      effect: { glyph: 'rock', mode: 'fall', count: 7, size: [8, 14], colors: ['textFaint', 'outline'], look: 'flat' },
    },
  },
  ribbon: STRAIGHT_BAR,
  seal: { radius: '18% 26% 22% 14%' },
  crest: {
    clip: 'polygon(12% 0, 88% 0, 100% 14%, 100% 100%, 0 100%, 0 14%)',
    edge: 1,
    foot: '0%',
    side: '0%',
  },
  bookmarkTab: { radius: '2px 2px 0 0', rise: 3, gap: 3 },
  // A counter is a carved rune stone, a use a tankard of ale, a training mark
  // an anvil.
  gemCuts: {
    counter: {
      outline: 'M30 6 L72 10 Q90 14 90 34 L86 80 Q84 94 68 94 L28 92 Q12 90 12 74 L14 26 Q16 8 30 6 Z',
      shading: [
        ['dark', 'M46 22 H54 V78 H46 Z'],
        ['dark', 'M54 34 L68 24 L72 30 L54 42 Z'],
        ['dark', 'M46 50 L32 40 L28 46 L46 58 Z'],
      ],
      glint: false,
      centre: [50, 50],
      shadowDrop: 6,
    },
    uses: {
      outline: 'M18 20 H66 V88 Q66 94 60 94 H24 Q18 94 18 88 Z M66 32 H80 Q92 32 92 46 V62 Q92 76 80 76 H66 V66 H78 Q82 66 82 62 V46 Q82 42 78 42 H66 Z M14 10 Q14 4 20 4 H64 Q70 4 70 10 V20 H14 Z',
      shading: [
        ['table', 'M18 8 H66 V18 H18 Z'],
        ['dark', 'M18 36 H66 V42 H18 Z'],
        ['dark', 'M18 72 H66 V78 H18 Z'],
        ['light', 'M24 46 H30 V68 H24 Z'],
      ],
      glint: false,
      centre: [44, 54],
      shadowDrop: 6,
      tones: { uses: 'warning' },
    },
    training: {
      outline: 'M6 20 H70 Q92 20 96 30 Q80 36 66 36 L60 50 H70 V62 H76 V76 H24 V62 H30 V50 H40 L32 36 H18 Q8 34 6 20 Z',
      shading: [
        ['dark', 'M24 62 H76 V76 H24 Z'],
        ['light', 'M10 22 H68 V26 H12 Z'],
      ],
      glint: false,
      centre: [50, 48],
      shadowDrop: 6,
    },
  },
  ornament: { path: 'M1 1 H11 V5 H7.5 V12 H4.5 V5 H1 Z' },
  marker: { outline: 'M1 3 L6 1 L11 3 V22 L6 29 L1 22 Z', lines: 'M6 6 V20 M6 9 L9 7 M6 13 L3 11' },
  bookmarkMark: { width: 5, inset: 3, radius: '0' },
  paper: { corners: [0.5, 0.25, 0.5, 0.25] },
  ink: LIT_INK,
  light: { finish: 'ember', page: 'vignette', soft: 1, bevel: 0.8, well: 1 },
  panel: litPanel({ banner: 'lintel' }),
  radius: 3,
  surface: unprinted('caverns'),
  motion: { pace: 1.3, hop: 0 },
});

// The fey cut: a glade at twilight. Lit, never drawn: soft-cornered panels in
// a light from overhead, hairlines with a faint glow, a long leaf for a
// panel's head, the enchanted wood behind every screen; its crest, gems and
// marks its own, below; nothing hops.
const FEY = deepFreeze({
  ...COMIC,
  // A leaf-shaped petal, a soft glow, a curling tendril for a tail.
  bubble: {
    fill: 'bubble',
    ink: 'textPrimary',
    texture: 'glow',
    frame: 'none',
    radius: '60% 10% 60% 10% / 40% 10% 40% 10%',
    border: { width: 2, style: 'solid', role: 'accentMuted' },
    outline: { width: 0, offset: 0, role: 'edge' },
    tilt: 0,
    shadow: 'glow',
    tail: { kind: 'curl', fill: 'accent', line: 'accent' },
    decor: 'none',
  },
  moments: {
    nat20: {
      // A watercolour flower, blooming, petals flying.
      burst: { kind: 'lobes', base: 26, amp: 24, count: 6, power: 0.7, scallop: true },
      fill: 'accent',
      paint: 'watercolor',
      number: 'soft',
      turn: 15,
      motion: 'bloom',
      effect: { glyph: 'petal', mode: 'fly', count: 9, size: [10, 16], colors: ['secondary', 'accent', 'spell'], look: 'soft' },
    },
    nat1: {
      // A hooked bramble, wilting, dry leaves falling.
      burst: { kind: 'star', points: 9, reach: 52, inner: 30, lean: 16, width: 105, squash: 0.9 },
      fill: 'danger',
      paint: 'watercolor',
      number: 'soft',
      turn: -8,
      motion: 'wilt',
      effect: { glyph: 'leaf', mode: 'fall', count: 6, size: [12, 18], colors: ['secondary', 'dangerDeep'], look: 'soft' },
    },
  },
  ribbon: STRAIGHT_BAR,
  seal: { radius: '50% 50% 50% 8%' },
  crest: {
    clip: 'polygon(0 100%, 0 12%, 4.2% 7.4%, 8.3% 3.5%, 12.5% 0.9%, 16.7% 0, 20.8% 0.9%, 25% 3.5%, 29.2% 7.4%, 33.3% 12%, 37.5% 7.4%, 41.7% 3.5%, 45.8% 0.9%, 50% 0, 54.2% 0.9%, 58.3% 3.5%, 62.5% 7.4%, 66.7% 12%, 70.8% 7.4%, 75% 3.5%, 79.2% 0.9%, 83.3% 0, 87.5% 0.9%, 91.7% 3.5%, 95.8% 7.4%, 100% 12%, 100% 100%)',
    edge: 1,
    foot: '0%',
    side: '0%',
  },
  bookmarkTab: { radius: '16px 16px 0 0', rise: 5, gap: 4 },
  // A counter is a flower, a use a toadstool, a training mark a leaf.
  gemCuts: {
    counter: {
      outline: 'M38.2 35.8 A17 17 0 1 1 61.8 35.8 A17 17 0 1 1 69 58.2 A17 17 0 1 1 50 72 A17 17 0 1 1 31 58.2 A17 17 0 1 1 38.2 35.8 Z',
      shading: [
        ['table', 'M40 52 A10 10 0 1 1 60 52 A10 10 0 1 1 40 52 Z'],
      ],
      glint: false,
      centre: [50, 52],
      shadowDrop: 5,
    },
    uses: {
      outline: 'M8 50 C8 22 28 8 50 8 C72 8 92 22 92 50 Q92 56 84 56 H16 Q8 56 8 50 Z M38 56 H62 L66 90 Q66 96 60 96 H40 Q34 96 34 90 Z',
      shading: [
        ['light', 'M30 30 A7 7 0 1 1 44 30 A7 7 0 1 1 30 30 Z'],
        ['light', 'M58 22 A6 6 0 1 1 70 22 A6 6 0 1 1 58 22 Z'],
        ['light', 'M64 42 A5 5 0 1 1 74 42 A5 5 0 1 1 64 42 Z'],
        ['dark', 'M56 56 H62 L66 90 Q66 96 60 96 H58 Z'],
      ],
      glint: false,
      centre: [50, 50],
      shadowDrop: 5,
    },
    training: {
      outline: 'M50 4 C78 20 88 50 50 96 C12 50 22 20 50 4 Z',
      shading: [
        ['dark', 'M50 4 C78 20 88 50 50 96 Z'],
      ],
      glint: false,
      centre: [50, 50],
      shadowDrop: 5,
    },
  },
  ornament: { path: 'M6 0 C10 3 10 8 6 12 C2 8 2 3 6 0 Z' },
  marker: { outline: 'M6 1 C12 9 11.5 21 6 29 C0.5 21 0 9 6 1 Z', lines: 'M6 4 V26 M6 12 L8.5 9.5 M6 17 L3.5 14.5' },
  bookmarkMark: { width: 5, inset: 4, radius: '0 8px 8px 0' },
  paper: { corners: [2, 1, 2, 1] },
  ink: { ...LIT_INK, depth: 1.2, glow: 2 },
  light: { finish: 'glow', page: 'vignette', soft: 0.8, bevel: 0.5, well: 0.8 },
  panel: litPanel({ banner: 'leaf' }),
  radius: 14,
  surface: unprinted('enchanted'),
  motion: { pace: 1.2, hop: 0 },
});

// The abyssal cut: a wreck in the deep. Lit, never drawn: what little light
// comes from above, falling off fast, hairlines with a sick glow, a wreck's
// plank for a panel's head and a tentacle gripping it, the drowned depths
// behind every screen; its crest, gems and marks its own, below; slow,
// nothing hops.
const ABYSSAL = deepFreeze({
  ...COMIC,
  // A wet blot of ink, its edge uneven, ink dripping off for a tail.
  bubble: {
    fill: 'surfaceDeep',
    ink: 'textPrimary',
    texture: 'glow',
    frame: 'none',
    radius: '42% 58% 48% 52% / 30% 34% 66% 70%',
    border: { width: 2, style: 'solid', role: 'accentMuted' },
    outline: { width: 0, offset: 0, role: 'edge' },
    tilt: 0,
    shadow: 'glow',
    tail: { kind: 'drips', fill: 'surfaceDeep', line: 'accentMuted' },
    decor: 'none',
  },
  moments: {
    nat20: {
      // An eye opening in bleeding ink, throbbing, eyes blinking open round it.
      burst: { kind: 'lens', width: 140, height: 88 },
      fill: 'accent',
      paint: 'inkbleed',
      number: 'glow',
      turn: 0,
      motion: 'throb',
      effect: { glyph: 'eye', mode: 'blink', count: 5, size: [18, 24], colors: ['accentText'], look: 'glow' },
    },
    nat1: {
      // An ink blot running, drowning, ink drops.
      burst: { kind: 'splat', base: 35, waves: [[3, 7, 60], [7, 5, 120], [13, 3]], drips: [[84, 30, 8], [118, 22, 7]] },
      fill: 'danger',
      paint: 'inkbleed',
      number: 'soft',
      turn: 0,
      motion: 'drown',
      effect: { glyph: 'drop', mode: 'fall', count: 6, size: [12, 18], colors: ['spell', 'surfaceDarkest'], look: 'soft' },
    },
  },
  ribbon: STRAIGHT_BAR,
  seal: { radius: '58% 42% 63% 37% / 41% 56% 44% 59%' },
  crest: {
    clip: 'polygon(6% 4%, 30% 0, 52% 5%, 74% 0, 96% 6%, 100% 34%, 95% 62%, 100% 92%, 72% 100%, 48% 95%, 24% 100%, 2% 94%, 5% 64%, 0 34%)',
    edge: 1,
    foot: '0%',
    side: '0%',
  },
  bookmarkTab: { radius: '12px 4px 0 0', rise: 4, gap: 4 },
  // A counter is an eye, open while there, shut once spent; a use a curled
  // tentacle; a training mark a sigil.
  gemCuts: {
    counter: {
      outline: 'M4 50 C24 18 76 18 96 50 C76 82 24 82 4 50 Z',
      shading: [
        ['table', 'M32 50 A18 18 0 1 1 68 50 A18 18 0 1 1 32 50 Z'],
        ['dark', 'M47 36 Q50 50 47 64 H53 Q50 50 53 36 Z'],
      ],
      glint: false,
      centre: [50, 50],
      shadowDrop: 4,
    },
    uses: {
      outline: 'M30 96 C10 70 20 40 46 30 C66 22 84 34 80 52 C76 66 58 66 56 56 C54 48 62 44 68 48 C66 38 52 36 44 44 C34 54 38 74 52 96 Z',
      shading: [
        ['table', 'M28 74 A4 4 0 1 1 36 74 A4 4 0 1 1 28 74 Z'],
        ['table', 'M28 56 A4 4 0 1 1 36 56 A4 4 0 1 1 28 56 Z'],
        ['table', 'M38 40 A3.5 3.5 0 1 1 45 40 A3.5 3.5 0 1 1 38 40 Z'],
      ],
      glint: false,
      centre: [50, 60],
      shadowDrop: 4,
      tones: { uses: 'spell' },
    },
    training: {
      outline: 'M10 50 A40 40 0 1 1 90 50 A40 40 0 1 1 10 50 Z',
      shading: [
        ['dark', 'M26 50 A24 24 0 1 1 74 50 A24 24 0 1 1 26 50 Z'],
        ['table', 'M42 50 A8 8 0 1 1 58 50 A8 8 0 1 1 42 50 Z'],
      ],
      glint: false,
      centre: [50, 50],
      shadowDrop: 4,
    },
  },
  ornament: { path: 'M0 6 C3 1 9 1 12 6 C9 11 3 11 0 6 Z' },
  marker: { outline: 'M6 1 C11.5 10 11.5 20 6 29 C0.5 20 0.5 10 6 1 Z', pupil: 'M6 8 C7.3 12 7.3 18 6 22 C4.7 18 4.7 12 6 8 Z' },
  paper: { corners: [0.5, 2, 1, 1.5] },
  ink: { ...LIT_INK, depth: 1.5, glow: 3 },
  light: { finish: 'glow', page: 'vignette', soft: 1, bevel: 0.4, well: 1 },
  panel: litPanel({ banner: 'plank', grip: 'tentacle' }),
  radius: 6,
  surface: unprinted('depths'),
  motion: { pace: 1.4, hop: 0 },
});

// The pixel cut: an 8-bit cartridge. Square everything, stepped corners,
// pixel coins, potions and hearts for the gems, scanlines over the bars,
// snappy moves.
const PIXEL = deepFreeze({
  ...COMIC,
  // A pixel dialog box, a double square border, a block shadow, a stepped tail.
  bubble: {
    fill: 'surface',
    ink: 'textPrimary',
    texture: 'plain',
    frame: 'none',
    radius: '0',
    border: { width: 3, style: 'solid', role: 'textPrimary' },
    outline: { width: 3, offset: 0, role: 'edge' },
    tilt: 0,
    shadow: 'block',
    tail: { kind: 'stairs', fill: 'surface', line: 'textPrimary' },
    decor: 'none',
  },
  moments: {
    nat20: {
      // An 8-bit star, a sprite's jump, pixel coins.
      burst: { kind: 'stairs', of: { kind: 'star', points: 8, reach: [52, 38], inner: 24 } },
      fill: 'accent',
      paint: 'pixel',
      number: 'flat',
      turn: 0,
      motion: 'jump',
      effect: { glyph: 'pixelCoin', mode: 'fly', count: 6, size: [14, 18], colors: ['accent'], look: 'flat' },
    },
    nat1: {
      // A broken pixel block, GAME OVER blinking, falling blocks.
      burst: { kind: 'stairs', of: { kind: 'splat', base: 40, waves: [[5, 8], [9, 5, 40]], steps: 18 } },
      fill: 'danger',
      paint: 'pixel',
      number: 'flat',
      turn: 0,
      motion: 'gameover',
      effect: { glyph: 'pixel', mode: 'fall', count: 9, size: [8, 12], colors: ['danger', 'textPrimary'], look: 'flat' },
    },
  },
  ribbon: {
    panel: { notch: 10, pad: 18 },
    tile: { notch: 5, pad: 7 },
    ends: '10,0 6,0 6,20 3,20 3,40 0,40 0,60 3,60 3,80 6,80 6,100 10,100',
  },
  seal: { radius: '0' },
  crest: {
    // A pixel frame: every corner a stair.
    clip: 'polygon(8% 0, 92% 0, 92% 6%, 96% 6%, 96% 12%, 100% 12%, 100% 88%, 96% 88%, 96% 94%, 92% 94%, 92% 100%, 8% 100%, 8% 94%, 4% 94%, 4% 88%, 0 88%, 0 12%, 4% 12%, 4% 6%, 8% 6%)',
    edge: 3,
    foot: '0%',
    side: '0%',
  },
  bookmarkTab: { radius: '0', rise: 4, gap: 4 },
  // A counter is a pixel coin, a use a pixel potion, a training mark a pixel
  // heart.
  gemCuts: {
    counter: {
      outline: 'M30 6 H70 V14 H80 V22 H88 V30 H94 V70 H88 V78 H80 V86 H70 V94 H30 V86 H20 V78 H12 V70 H6 V30 H12 V22 H20 V14 H30 Z',
      shading: [
        ['table', 'M42 26 H58 V74 H42 Z'],
        ['light', 'M20 30 H28 V50 H20 Z'],
        ['dark', 'M80 30 H86 V70 H80 Z'],
      ],
      glint: false,
      centre: [50, 50],
      shadowDrop: 6,
    },
    uses: {
      outline: 'M40 6 H60 V20 H56 V30 H70 V38 H80 V86 H72 V94 H28 V86 H20 V38 H30 V30 H44 V20 H40 Z',
      shading: [
        ['table', 'M24 56 H76 V86 H24 Z'],
        ['light', 'M28 42 H34 V52 H28 Z'],
      ],
      glint: false,
      centre: [50, 56],
      shadowDrop: 6,
      tones: { uses: 'danger' },
    },
    training: {
      outline: 'M14 20 H42 V28 H58 V20 H86 V28 H94 V54 H86 V62 H78 V70 H70 V78 H58 V86 H42 V78 H30 V70 H22 V62 H14 V54 H6 V28 H14 Z',
      shading: [
        ['light', 'M14 28 H26 V40 H14 Z'],
        ['dark', 'M78 40 H86 V54 H78 Z'],
      ],
      glint: false,
      centre: [50, 50],
      shadowDrop: 6,
    },
  },
  ornament: { path: 'M4 0 H8 V4 H12 V8 H8 V12 H4 V8 H0 V4 H4 Z' },
  marker: { outline: 'M4 1 H8 V3 H10 V27 H8 V29 H4 V27 H2 V3 H4 Z', light: 'M4 3 H6 V9 H4 Z', shade: 'M8 17 H10 V27 H8 Z', crisp: true },
  bookmarkMark: { width: 4, inset: 0, radius: '0' },
  paper: { corners: [0, 0, 0, 0] },
  dieGlyph: { path: 'M1.5 1.5 L10.5 1.5 L10.5 10.5 L1.5 10.5 Z' },
  ink: { edge: 3, drop: 1, depth: 1, glow: 0, lettering: 1 },
  panel: {
    bar: 'fill', hatch: true, frame: 'solid', frameWidth: 3, badge: 'seal', float: 0,
    flourish: { kind: 'none', width: 0, height: 0, at: 'right' }, grip: 'none', banner: 'marquee', tileBanner: 'none',
  },
  radius: 1,
  surface: {
    paper: 'wilds',
    halftone: { dot: 1, step: 6 },
    screentone: { line: 2, gap: 4, angle: 0 },
    rays: 0.3,
  },
  motion: { pace: 0.6, hop: 1 },
});

// The cyberpunk cut: the megacity's signs. The sci-fi cut's lit lines, without
// their glow: panels lit from overhead, a slanted sign plate in the full
// accent for a panel's head, the megacity behind every screen; fast, nothing
// hops.
const CYBERPUNK = deepFreeze({
  ...SCIFI,
  // A slanted panel, its corners sliced, a lit bar down its side, a hazard stripe at its foot, an angular tab for a tail.
  bubble: {
    fill: 'bubble',
    ink: 'textPrimary',
    texture: 'plain',
    frame: 'slant',
    radius: 'theme',
    border: { width: 0, style: 'solid', role: 'accent' },
    outline: { width: 0, offset: 0, role: 'edge' },
    tilt: 0,
    shadow: 'drop',
    tail: { kind: 'angular', fill: 'bubble', line: 'accent' },
    decor: 'hazard',
  },
  moments: {
    nat20: {
      // Neon shards, sliced in by a glitch, data fragments.
      burst: { kind: 'star', points: 7, reach: [62, 40, 56, 36, 60, 44, 50], inner: [18, 22, 16, 20, 24, 18, 20], width: 130, squash: 0.75, rotate: -80 },
      fill: 'accent',
      paint: 'neon',
      number: 'glow',
      turn: -6,
      motion: 'glitchin',
      effect: { glyph: 'shard', mode: 'fly', count: 8, size: [10, 16], colors: ['accent', 'secondary', 'info'], look: 'glow' },
    },
    nat1: {
      // A virus in neon, a short circuit, the virus spreading.
      burst: { kind: 'virus', body: 30, spikes: 10, length: 13, knob: 4.5 },
      fill: 'danger',
      paint: 'neon',
      number: 'glow',
      turn: 8,
      motion: 'short',
      effect: { glyph: 'virus', mode: 'pop', count: 8, size: [12, 18], colors: ['danger', 'secondary'], look: 'glow' },
    },
  },
  seal: { radius: '0 8px 0 8px' },
  crest: {
    // Two corners sliced off, as a cut plate of armour.
    clip: 'polygon(0 0, 84% 0, 100% 22%, 100% 100%, 16% 100%, 0 78%)',
    edge: 1,
    foot: '0%',
    side: '0%',
  },
  bookmarkTab: { radius: '0', rise: 3, gap: 2 },
  // A counter is a data shard, a use an energy bolt, a training mark a slanted
  // bar.
  gemCuts: {
    counter: {
      outline: 'M24 6 H66 L80 20 V94 H24 Z',
      shading: [
        ['table', 'M32 14 H62 L72 24 V44 H32 Z'],
        ['dark', 'M24 80 H80 V94 H24 Z'],
      ],
      glint: false,
      centre: [52, 50],
      shadowDrop: 4,
    },
    uses: {
      outline: 'M58 2 L18 56 H44 L36 98 L82 40 H54 Z',
      shading: [
        ['light', 'M58 2 L18 56 H30 L52 18 Z'],
        ['dark', 'M54 40 H82 L36 98 L44 72 Z'],
      ],
      glint: false,
      centre: [50, 50],
      shadowDrop: 4,
    },
    training: {
      outline: 'M30 18 H96 L70 82 H4 Z',
      shading: [
        ['dark', 'M64 18 H96 L70 82 H38 Z'],
      ],
      glint: false,
      centre: [50, 50],
      shadowDrop: 4,
    },
  },
  meterSegments: { bar: 16, piece: 8, smooth: 0 },
  ornament: { path: 'M0 2 L5 6 L0 10 H3 L8 6 L3 2 Z' },
  marker: { outline: 'M4.5 1 H11.5 L7.5 29 H0.5 Z', glitch: 'M4.4 15 H12.6 L12.1 18.5 H3.9 Z' },
  bookmarkMark: { width: 4, inset: 2, radius: '0' },
  paper: { corners: [0, 1.5, 0, 1.5] },
  dieGlyph: { path: 'M3 0.5 H11.5 V9 L9 11.5 H0.5 V3 Z' },
  ink: { ...LIT_INK, depth: 1.2 },
  light: { finish: 'glow', page: 'vignette', soft: 0.8, bevel: 0.5, well: 1 },
  // Its icon on a seal: bare, a pale drawing is lost on the banner's light ground.
  panel: litPanel({ banner: 'glitch', badge: 'seal' }),
  radius: 2,
  surface: unprinted('megacity'),
  motion: { pace: 0.6, hop: 0 },
});

// The superhero cut: the comic one off the newsstand. Its ink, seals and
// switches kept; the bars' ends cut as a lightning bolt, the crest a hero's
// emblem, a slot's gem a star and a use's a bolt, a card's mark a bolt; the
// bars a yellow caption box, a bolt and speed lines by the title; Ben-Day
// dots on the bubble and the page, no stickers; hard offset shadows, squarer
// panels, quick and springy.
const SUPERHERO = deepFreeze({
  ...COMIC,
  // The comic's balloon, Ben-Day dots in its corner, its shadow thrown hard.
  bubble: { ...COMIC.bubble, texture: 'benday', tilt: -1.2 },
  moments: {
    nat20: {
      // KAPOW in yellow, a spring, POW bursts popping in red and blue.
      ...COMIC.moments.nat20,
      effect: { glyph: 'pow', mode: 'pop', count: 9, size: [18, 30], colors: ['secondary', 'info', 'accentHighlight'], look: 'ink' },
    },
    nat1: {
      // A red crash, a groan, stars circling the head.
      ...COMIC.moments.nat1,
      effect: { glyph: 'star', mode: 'orbit', count: 4, size: [22, 22], colors: ['accent'], look: 'ink' },
    },
  },
  ribbon: {
    panel: { notch: 12, pad: 20 },
    tile: { notch: 4, pad: 5 },
    // Each end a lightning bolt's zigzag.
    ends: '0,0 7,42 2,56 10,100',
  },
  seal: { radius: '50%' },
  // A hero's emblem: a shield whose sides run down to a deep point, its
  // name's band square across the top so no letter is cut, its figures kept
  // above the point.
  crest: {
    clip: 'polygon(0 0, 100% 0, 100% 62%, 50% 100%, 0 62%)',
    edge: 3,
    foot: '30%',
    side: '0%',
  },
  // A slot's gem is a star (blue for a spell's slot, the pact's violet), a
  // use's a lightning bolt in the yellow; a training mark the comic's diamond.
  gemCuts: {
    counter: {
      outline: 'M50 6 L61.8 37.8 L95.6 39.2 L69 60.2 L78.2 92.8 L50 74 L21.8 92.8 L31 60.2 L4.4 39.2 L38.2 37.8 Z',
      shading: [
        ['dark', 'M50 6 L61.8 37.8 L95.6 39.2 L69 60.2 L78.2 92.8 L50 74 Z'],
        ['table', 'M61.8 37.8 L69 60.2 L50 74 L31 60.2 L38.2 37.8 Z'],
      ],
      glint: true,
      centre: [50, 54],
      shadowDrop: 6,
    },
    uses: {
      outline: 'M56 2 L20 56 H46 L38 98 L80 42 H54 L68 2 Z',
      shading: [
        ['light', 'M56 2 L20 56 H30 L60 8 Z'],
        ['dark', 'M80 42 L38 98 L48 76 L70 46 Z'],
      ],
      glint: false,
      centre: [50, 50],
      shadowDrop: 6,
    },
    training: COMIC.gemCuts.training,
  },
  ornament: { path: 'M7 0 L2 7 H5.5 L4.5 12 L10 4.5 H6.5 L8 0 Z' },
  marker: { outline: 'M8 1 L2 16 H6 L4 29 L10.5 12 H6.5 L9.5 1 Z' },
  ink: { ...COMIC.ink, drop: 1.6 },
  panel: {
    ...COMIC.panel,
    flourish: { kind: 'bolt', width: 64, height: 20, at: 'right' },
    banner: 'caption',
  },
  radius: 6,
  surface: {
    paper: 'none',
    halftone: { dot: 1.6, step: 8 },
    screentone: { line: 2, gap: 6, angle: -45 },
    rays: 1,
  },
  motion: { pace: 0.9, hop: 1.2 },
});

// What a noir shot glass keeps whether full or drunk: its thick foot and its
// two walls.
const GLASS_FOOT = 'M32.2 80 H67.8 L66 92 H34 Z';
const GLASS_WALLS = [['textMuted', 'M22 12 H25.5 L36.6 92 H34 Z'], ['textMuted', 'M74.5 12 H78 L66 92 H63.4 Z']];

// The noir cut: a detective's office at night, lit and never drawn. No ink
// line and no solid shadow: square panels edged in a hairline a shade off
// the dark, raised by a soft shadow and the light along their top edge,
// shaded as a desk lamp lights them from the upper left; a street lamp's
// light through venetian blinds on the page, under a film's grain; a title
// typed on the label of a case folder's tab, its icon on a sticker beside
// it, no screentone, no rays; an
// art-deco plaque for the crest, a case folder for a bubble, lettering typed
// and printed, never inked; bullets, shots of whiskey and shields for the gems, a spade
// for the ornament, a keyhole for a card's mark; slow and still, nothing
// hops. The first style built on the light instead of the ink (2026-11-24).
const NOIR = deepFreeze({
  ...COMIC,
  // A manila case file folder, its labelled tab standing up at the left, the
  // blinds' shadow across it, lying straight; no tail, a folder points at
  // nothing.
  bubble: {
    fill: 'paperShade',
    ink: 'onPaper',
    texture: 'blinds',
    frame: 'none',
    radius: '3px',
    border: { width: 2, style: 'solid', role: 'edge' },
    outline: { width: 0, offset: 0, role: 'edge' },
    tilt: 0,
    shadow: 'soft',
    tail: { kind: 'none', fill: 'paperShade', line: 'edge' },
    decor: 'folder',
  },
  moments: {
    nat20: {
      // A press camera's flashbulb going off, looming out of the dark, sparks of light.
      burst: { kind: 'star', points: 16, reach: [54, 44], inner: 30, width: 110, squash: 0.9 },
      fill: 'accent',
      paint: 'engraving',
      number: 'engrave',
      turn: 0,
      motion: 'loom',
      effect: { glyph: 'sparkle', mode: 'pop', count: 6, size: [14, 24], colors: ['textPrimary', 'accent'], look: 'silhouette' },
    },
    nat1: {
      // Blood on the floor, the bubble fainting, smoke rising.
      burst: { kind: 'splat', base: 32, waves: [[6, 4], [13, 2, 40]], drips: [[80, 24, 8], [110, 30, 6]] },
      fill: 'dangerDeep',
      paint: 'inkbleed',
      number: 'engrave',
      turn: 0,
      motion: 'faint',
      effect: { glyph: 'puff', mode: 'rise', count: 6, size: [20, 30], colors: ['textMuted', 'outline'], look: 'soft' },
    },
  },
  ribbon: STRAIGHT_BAR,
  seal: { radius: '3px' },
  // An art-deco plaque: square across its name's band, its foot stepped
  // down to the middle, edged in the hairline.
  crest: {
    clip: 'polygon(0 0, 100% 0, 100% 86%, 82% 86%, 82% 93%, 66% 93%, 66% 100%, 34% 100%, 34% 93%, 18% 93%, 18% 86%, 0 86%)',
    edge: 1,
    foot: '14%',
    side: '0%',
  },
  bookmarkTab: { radius: '2px 2px 0 0', rise: 3, gap: 3 },
  // A slot is a bullet of the twenties: a short, stout round standing on its
  // rim, a round nose of lead in the slot's colour over a brass case crimped
  // at its mouth; spent, it is gone, its place left empty. A use is a shot of
  // whiskey, drunk once spent, a drop left in the glass. A training mark is a
  // detective's shield in brass, a star struck in it for an expert.
  gemCuts: {
    counter: {
      outline: 'M27 94 V88 H30 V46 C30 22 40 12 50 12 C60 12 70 22 70 46 V88 H73 V94 Z',
      shading: [
        ['light', 'M36 42 C36 30 40 22 46 18 C42 25 39.5 33 39.5 42 Z'],
        ['dark', 'M62 46 C62 30 58 20 52 13 C62 15 70 26 70 46 Z'],
        ['warning', 'M30 46 H70 V88 H30 Z'],
        ['warningStrong', 'M60 46 H70 V88 H60 Z'],
        ['accentHighlight', 'M35 54 H37.5 V82 H35 Z'],
        ['outline', 'M30 46 H70 V50 H30 Z'],
        ['warningStrong', 'M27 88 H73 V94 H27 Z'],
      ],
      glint: false,
      centre: [50, 54],
      shadowDrop: 4,
    },
    uses: {
      outline: 'M22 12 H78 L66 92 H34 Z',
      shading: [
        ['surfaceSunken', 'M22 12 H78 L74.4 36 H25.6 Z'],
        ['light', 'M25.6 36 H74.4 L73.8 40 H26.2 Z'],
        ['light', 'M31 46 H35.5 L38.5 76 H35 Z'],
        ['dark', GLASS_FOOT],
        ...GLASS_WALLS,
      ],
      spent: [
        ['outline', GLASS_FOOT],
        ['base', 'M42 78 A8 3 0 1 0 58 78 A8 3 0 1 0 42 78 Z'],
        ...GLASS_WALLS,
      ],
      glint: false,
      centre: [50, 52],
      shadowDrop: 4,
      tones: { uses: 'warning' },
    },
    training: {
      outline: 'M50 4 L88 20 V52 C88 76 68 90 50 98 C32 90 12 76 12 52 V20 Z',
      shading: [
        ['dark', 'M88 20 V52 C88 76 68 90 50 98 C64 88 78 74 78 52 V24 Z'],
        ['light', 'M24 42 C24 30 30 24 46 17 C36 25 32 33 32 43 Z'],
      ],
      expert: [
        ['black', 'M50 26 L55.9 41.9 L72.8 42.6 L59.5 53.1 L64.1 69.4 L50 60 L35.9 69.4 L40.5 53.1 L27.2 42.6 L44.1 41.9 Z'],
      ],
      glint: false,
      centre: [50, 52],
      shadowDrop: 4,
      tones: { training: 'warning' },
    },
  },
  ornament: { path: 'M6 0 C8 3 12 5 12 8 C12 10.2 9.8 11 8 9.8 L9 12 H3 L4 9.8 C2.2 11 0 10.2 0 8 C0 5 4 3 6 0 Z' },
  marker: { outline: 'M6 2 C8.5 2 10 3.8 10 6 C10 7.6 9.2 8.8 8 9.5 L10 28 H2 L4 9.5 C2.8 8.8 2 7.6 2 6 C2 3.8 3.5 2 6 2 Z' },
  bookmarkMark: { width: 3, inset: 3, radius: '0' },
  paper: { corners: [0.2, 0.2, 0.2, 0.2] },
  ink: LIT_INK,
  // Lit, not drawn: the desk lamp on every surface, the blinds on the page,
  // whatever is raised on a soft shadow with the light along its top edge,
  // whatever is sunken shaded inside.
  light: { finish: 'lamp', page: 'blinds', soft: 1, bevel: 1, well: 1 },
  // Its title typed on the label of a case folder's tab, its icon on a
  // sticker beside it.
  panel: litPanel({ banner: 'folder', badge: 'seal' }),
  // The ability scores are six cards pinned to the board, a red thread from
  // pin to pin, the modifier large over the score.
  abilities: { drawing: 'cards', figures: 'stacked' },
  // A roll makes the front page of "Tonight's Roll". At a natural 20 it
  // spins in under "Breaking news: Natural 20!" printed on red, among the
  // photographers' bulbs; at a natural 1 it is slapped down on the table
  // under "Found dead: You" printed on ink, and shot through three times.
  rollToast: { drawing: 'newspaper' },
  // A notice is a clipping from that paper, stamped in its colour.
  notice: { drawing: 'clipping' },
  radius: 3,
  surface: unprinted('none'),
  motion: { pace: 1.3, hop: 0 },
});

// The looks' styles the viewer can choose from (the "Style" of the settings'
// theme panel), each with the palette it is drawn in for each mode
// (`palettes`: dark and light, ids of colors.js PALETTES).
export const SHAPE_STYLES = Object.freeze({
  comic: Object.freeze({ id: 'comic', label: 'Comic fantasy', palettes: Object.freeze({ dark: 'dark', light: 'light' }), shapes: COMIC }),
  scifi: Object.freeze({ id: 'scifi', label: 'Sci-fi', palettes: Object.freeze({ dark: 'neon', light: 'neonLight' }), shapes: SCIFI }),
  gothic: Object.freeze({ id: 'gothic', label: 'Comic gothic', palettes: Object.freeze({ dark: 'dread', light: 'mist' }), shapes: GOTHIC }),
  war: Object.freeze({ id: 'war', label: 'War horror', palettes: Object.freeze({ dark: 'trench', light: 'dossier' }), shapes: WAR }),
  astral: Object.freeze({ id: 'astral', label: 'Arcane astral', palettes: Object.freeze({ dark: 'starlight', light: 'vellum' }), shapes: ASTRAL }),
  pirate: Object.freeze({ id: 'pirate', label: 'Pirate seas', palettes: Object.freeze({ dark: 'deepSea', light: 'seaChart' }), shapes: PIRATE }),
  steampunk: Object.freeze({ id: 'steampunk', label: 'Steampunk', palettes: Object.freeze({ dark: 'foundry', light: 'patent' }), shapes: STEAMPUNK }),
  dwarven: Object.freeze({ id: 'dwarven', label: 'Dwarven forge', palettes: Object.freeze({ dark: 'forge', light: 'granite' }), shapes: DWARVEN }),
  fey: Object.freeze({ id: 'fey', label: 'Feywild', palettes: Object.freeze({ dark: 'twilight', light: 'blossom' }), shapes: FEY }),
  abyssal: Object.freeze({ id: 'abyssal', label: 'Abyssal horror', palettes: Object.freeze({ dark: 'abyss', light: 'asylum' }), shapes: ABYSSAL }),
  pixel: Object.freeze({ id: 'pixel', label: 'Pixel retro', palettes: Object.freeze({ dark: 'arcade', light: 'cartridge' }), shapes: PIXEL }),
  cyberpunk: Object.freeze({ id: 'cyberpunk', label: 'Cyberpunk', palettes: Object.freeze({ dark: 'overdrive', light: 'daylight' }), shapes: CYBERPUNK }),
  superhero: Object.freeze({ id: 'superhero', label: 'Comic superhero', palettes: Object.freeze({ dark: 'heroNight', light: 'newsprint' }), shapes: SUPERHERO }),
  noir: Object.freeze({ id: 'noir', label: 'Noir detective', palettes: Object.freeze({ dark: 'midnight', light: 'caseFile' }), shapes: NOIR }),
});

export const BASE_STYLE_ID = 'comic';

// A style's id as kept before it was renamed (a theme choice in this
// browser, a player's dice, a roll an older client sent) → its id now:
// comic lavender became comic superhero (2026-11-19).
const RENAMED_STYLES = Object.freeze({ lavender: 'superhero' });

// A kept style id as it is now: a renamed one's new id, any other as given.
export function currentStyleId(styleId) {
  return RENAMED_STYLES[styleId] || styleId;
}

// The style the viewer draws in, for what reads it outside React: a roll sent
// to the table carries it (rollFeed.js), so every screen draws that roll's
// bubble as its roller sees it. The theme's provider keeps it.
let viewerStyle = BASE_STYLE_ID;

export function setViewerStyle(styleId) {
  viewerStyle = SHAPE_STYLES[styleId] ? styleId : BASE_STYLE_ID;
}

export function viewerStyleId() {
  return viewerStyle;
}

// A style a roll carries, if it is one this client knows; null otherwise (an
// older client's roll, or a style added since), drawn in the viewer's own.
export function sharedStyle(styleId) {
  const current = currentStyleId(styleId);
  return SHAPE_STYLES[current] ? current : null;
}

// A style's shapes, the base style's for an unknown id.
export function styleShapes(styleId) {
  return (SHAPE_STYLES[styleId] || SHAPE_STYLES[BASE_STYLE_ID]).shapes;
}

// The palette a style is drawn in for a mode ('dark' or 'light'): the base
// style's for an unknown id, its dark one for a mode it has none for. The one
// way from a style to its palette (the page's, a sample's, a die's).
export function paletteForStyle(styleId, mode) {
  const style = SHAPE_STYLES[styleId] || SHAPE_STYLES[BASE_STYLE_ID];
  return style.palettes[mode] || style.palettes.dark;
}

// The boxes the ornament's and the die glyph's paths are drawn in, px: a
// layout size, the same in every style.
export const ORNAMENT_BOX = 12;
export const DIE_GLYPH_BOX = 12;

// The shapes that are CSS values, as the chosen style's variables: what a
// recipe writes in sx, in the theme's overrides or in a constant made once.
const shapeVariable = (name) => `var(--gb-shape-${name})`;

export const RIBBON = Object.freeze({
  panel: Object.freeze({ notch: shapeVariable('ribbon-panel-notch'), pad: shapeVariable('ribbon-panel-pad'), clip: shapeVariable('ribbon-panel-clip') }),
  tile: Object.freeze({ notch: shapeVariable('ribbon-tile-notch'), pad: shapeVariable('ribbon-tile-pad'), clip: shapeVariable('ribbon-tile-clip') }),
});

// A bar's cut (a clip-path) for its `ends` (shapes' ribbon.ends: the left
// end's edge, top to foot, in a box 10 wide by 100 tall) and a notch `notch`
// deep (a CSS length): along the top from the left end's first point, down
// the right end (its mirror), back along the foot and up the left end. The
// comic's swallowtail: polygon(0 0, 100% 0, calc(100% - n) 50%, 100% 100%,
// 0 100%, n 50%).
export function ribbonEndsClip(ends, notch) {
  const points = ends.split(' ').map((point) => point.split(',').map(Number));
  const across = (x) => (x === 0 ? '' : x === 10 ? notch : `${notch} * ${x / 10}`);
  const left = ([x, y]) => `${x === 0 ? '0' : x === 10 ? notch : `calc(${across(x)})`} ${y === 0 ? '0' : `${y}%`}`;
  const right = ([x, y]) => `${x === 0 ? '100%' : `calc(100% - ${across(x)})`} ${y === 0 ? '0' : `${y}%`}`;
  return `polygon(${[left(points[0]), ...points.map(right), ...points.slice(1).reverse().map(left)].join(', ')})`;
}

// Where a panel title's flourish sits (shapes' panel.flourish), as the two
// background layers the bar keeps for it (PanelHeader.jsx): one at its right
// end, or one at each end; none drawn at no size.
function flourishVariables({ kind, width, height, at }) {
  const size = kind === 'none' ? '0 0' : `${width}px ${height}px`;
  return {
    '--gb-panel-flourish-size': size,
    '--gb-panel-flourish-size-2': at === 'ends' ? size : '0 0',
    '--gb-panel-flourish-at': at === 'ends' ? 'left 4px center' : 'right 10px center',
    '--gb-panel-flourish-at-2': 'right 4px center',
  };
}

export const SEAL_RADIUS = shapeVariable('seal-radius');

export const CREST = Object.freeze({
  clip: shapeVariable('crest-clip'),
  edge: shapeVariable('crest-edge'),
  foot: shapeVariable('crest-foot'),
  side: shapeVariable('crest-side'),
});

export const FOCUS_RING = Object.freeze({
  width: shapeVariable('focus-width'),
  gap: shapeVariable('focus-gap'),
});

export const CHOICE_MARK = Object.freeze({ size: shapeVariable('choice-mark') });

// A moment's burst (rollMoment.js) as the chosen style draws it: its box as
// wide as its shape for the height it is drawn at (its width over its
// height), and how far it is turned.
export const MOMENT_BURST = Object.freeze({
  nat20: Object.freeze({ aspect: shapeVariable('nat20-aspect'), turn: shapeVariable('nat20-turn') }),
  nat1: Object.freeze({ aspect: shapeVariable('nat1-aspect'), turn: shapeVariable('nat1-turn') }),
});

// The moments a roll can have, and the variables a style fills for each.
const momentVariables = (moments) => Object.fromEntries(Object.entries(moments).flatMap(([moment, { burst, turn }]) => [
  [`--gb-shape-${moment}-aspect`, String((burst.width ?? 100) / 100)],
  [`--gb-shape-${moment}-turn`, `${turn}deg`],
]));

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
    '--gb-shape-ribbon-panel-clip': ribbonEndsClip(shapes.ribbon.ends, 'var(--gb-shape-ribbon-panel-notch)'),
    '--gb-shape-ribbon-tile-clip': ribbonEndsClip(shapes.ribbon.ends, 'var(--gb-shape-ribbon-tile-notch)'),
    '--gb-shape-seal-radius': shapes.seal.radius,
    '--gb-shape-crest-clip': shapes.crest.clip,
    '--gb-shape-crest-edge': `${shapes.crest.edge}px`,
    '--gb-shape-crest-foot': shapes.crest.foot,
    '--gb-shape-crest-side': shapes.crest.side,
    '--gb-shape-focus-width': `${shapes.focusRing.width}px`,
    '--gb-shape-focus-gap': `${shapes.focusRing.gap}px`,
    '--gb-shape-choice-mark': `${shapes.choiceMark.size}px`,
    ...momentVariables(shapes.moments),
    '--gb-ink-edge': `${shapes.ink.edge}px`,
    '--gb-ink-line': String(shapes.ink.edge / COMIC.ink.edge),
    '--gb-ink-drop': String(shapes.ink.drop),
    '--gb-ink-depth': String(shapes.ink.depth),
    '--gb-ink-glow': `${shapes.ink.glow}px`,
    '--gb-ink-lettering': String(shapes.ink.lettering),
    '--gb-panel-frame-width': `${shapes.panel.frameWidth}px`,
    '--gb-panel-frame-style': shapes.panel.frame,
    ...flourishVariables(shapes.panel.flourish),
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
