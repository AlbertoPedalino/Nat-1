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
  // table), `glint` whether the comic glint shines on it, `centre` the point
  // its spent setting shrinks to. Either may bring `tones`, a palette role by
  // what it counts (GEM_TONES' kinds), over the colour GemPip gives it: blood
  // is red, brass a cartridge's. A style's counter and uses must differ in
  // their cut or in every colour.
  gemCuts: {
    counter: HEXAGON_GEM,
    uses: HEXAGON_GEM,
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
  // `lettering` how strongly titles and figures are inked (an outline and a
  // solid shadow, shadows.js inkLettering): 1 the comic's, 0 printed plain.
  ink: { edge: 2, drop: 1, depth: 1, glow: 0, lettering: 1 },
  // How a panel is built (PanelHeader.jsx): its title `bar` a filled strip
  // ('fill') or only a rule in the panel's tone under the title ('rule'),
  // `hatch` its screentone, the `frame` round it 'solid' or 'double' and
  // `frameWidth` px wide (the comic cut's, scaled with the ink), its icon on a
  // wax seal or 'bare', and how far it `float`s on a soft shadow (0: none,
  // the ink's solid shadow alone). Its title's `flourish`: an ornament drawn
  // on the bar (panelOrnaments.js: a line of stars, rivets, a vine, a
  // tentacle) `width` by `height` px, at its `right` end or at both `ends`;
  // 'none' for none.
  panel: {
    bar: 'fill', hatch: true, frame: 'solid', frameWidth: 3, badge: 'seal', float: 0,
    flourish: { kind: 'none', width: 0, height: 0, at: 'right' },
  },
  // The theme's corner radius, px: every `borderRadius: n` in sx is n times it.
  radius: 10,
  // The surfaces' textures (surfaces.js): `paper` the drawings over the page
  // ('stickers', the game's things as stickers: stickerPaper.js; a scene
  // drawn behind every screen, pageScenes.js: 'graveyard', 'tropics'…;
  // 'none'); the
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
    panel: { notch: 10, pad: 18 },
    tile: { notch: 4, pad: 7 },
    ends: '10,0 0,30 0,70 10,100',
  },
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
  ink: { edge: 1, drop: 0, depth: 1.5, glow: 6, lettering: 1 },
  panel: {
    bar: 'fill', hatch: true, frame: 'solid', frameWidth: 3, badge: 'seal', float: 0,
    flourish: { kind: 'none', width: 0, height: 0, at: 'right' },
  },
  radius: 3,
  surface: {
    paper: 'planets',
    halftone: { dot: 1, step: 22 },
    screentone: { line: 1, gap: 4, angle: 0 },
    rays: 0.6,
  },
  motion: { pace: 0.7, hop: 0 },
});

// The gothic cut: the comic one in a haunted land. Deeper, tattered
// swallowtails, a headstone for the crest, seals like dripped wax, arched tabs, a
// cross for the ornament, torn paper; the comic ink, stickers and gems kept,
// moving a little slower.
const GOTHIC = deepFreeze({
  ...COMIC,
  ribbon: {
    panel: { notch: 14, pad: 22 },
    tile: { notch: 5, pad: 6 },
    ends: '10,0 0,50 10,100',
  },
  seal: { radius: '42% 58% 50% 50% / 60% 44% 56% 40%' },
  // The ability scores' crest is a headstone: a round arch over a flat foot.
  crest: {
    clip: 'polygon(0 30%, 1.7% 22.2%, 6.7% 15%, 14.6% 8.8%, 25% 4%, 37.1% 1%, 50% 0, 62.9% 1%, 75% 4%, 85.4% 8.8%, 93.3% 15%, 98.3% 22.2%, 100% 30%, 100% 100%, 0 100%)',
    edge: 3,
    foot: '0%',
    side: '0%',
  },
  bookmarkTab: { radius: '10px 10px 0 0', rise: 4, gap: 4 },
  // A counter is a drop of blood (red for a spell's slot, the pact's violet),
  // spent a dried stain; a use an amber candle, burnt out once spent; a training
  // mark a grave's cross.
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
      outline: 'M50 4 C58 16 64 24 64 34 A14 14 0 0 1 36 34 C36 24 42 16 50 4 Z M36 54 H64 V94 H36 Z',
      shading: [
        ['table', 'M50 20 C54 27 56 31 56 36 A6 6 0 0 1 44 36 C44 31 46 27 50 20 Z'],
        ['dark', 'M56 54 H64 V94 H56 Z'],
        ['light', 'M39 54 H44 V90 H39 Z'],
      ],
      glint: false,
      centre: [50, 50],
      shadowDrop: 5,
      // Amber: the style's accent is blood's red.
      tones: { uses: 'warning' },
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
  paper: { corners: [0.3, 2, 0.5, 1.5] },
  radius: 8,
  surface: {
    paper: 'graveyard',
    halftone: { dot: 1, step: 7 },
    screentone: { line: 2, gap: 6, angle: -45 },
    rays: 0.8,
  },
  motion: { pace: 1.15, hop: 0.8 },
});

// The war cut: a WWII dossier gone wrong. Straight labels like a crate's
// stencil, round rubber-stamp seals, a rank chevron for the crest, folder
// tabs, a military star, paper grain over the page and hatching over the
// bars, heavy ink and slow, wary moves.
const WAR = deepFreeze({
  ribbon: {
    panel: { notch: 12, pad: 20 },
    tile: { notch: 5, pad: 7 },
    ends: '10,0 0,100',
  },
  seal: { radius: '50%' },
  crest: {
    // A dog tag: rounded corners, the chain's notch in its side.
    clip: 'polygon(8% 0, 92% 0, 97% 3%, 100% 10%, 100% 90%, 97% 97%, 92% 100%, 8% 100%, 3% 97%, 0 90%, 0 62%, 4% 58%, 4% 42%, 0 38%, 0 10%, 3% 3%)',
    edge: 2,
    foot: '0%',
    side: '2%',
  },
  bookmarkTab: { radius: '6px 6px 0 0', rise: 3, gap: 3 },
  // A counter is a cartridge (brass for a spell's slot, steel for the
  // pact's), spent an empty chamber; a use an olive grenade, an empty pouch once
  // thrown; a training mark a rank chevron.
  gemCuts: {
    counter: {
      outline: 'M34 94 V46 C34 28 41 13 50 4 C59 13 66 28 66 46 V94 Z',
      shading: [
        ['table', 'M34 46 C34 28 41 13 50 4 C59 13 66 28 66 46 Z'],
        ['dark', 'M58 46 H66 V94 H58 Z'],
        ['dark', 'M34 84 H66 V94 H34 Z'],
      ],
      glint: true,
      centre: [50, 50],
      shadowDrop: 4,
      tones: { slot: 'warning', pact: 'armor' },
    },
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
    training: {
      outline: 'M4 50 L50 10 L96 50 V84 L50 46 L4 84 Z',
      shading: [
        ['dark', 'M50 46 L96 84 V70 L50 32 Z'],
        ['light', 'M4 50 L50 10 L50 20 L4 60 Z'],
      ],
      glint: false,
      centre: [50, 48],
      shadowDrop: 4,
    },
  },
  meterSegments: { bar: 10, piece: 5, smooth: 0 },
  bursts: {
    kapow: {
      width: 125,
      squash: 0.82,
      spikes: [[-90, 60, 6], [-58, 44, -5], [-30, 64, 8], [-6, 40, -2], [20, 58, 7], [44, 46, -6], [70, 66, 4], [96, 42, -3], [120, 60, 9], [146, 48, -7], [170, 62, 3], [196, 40, -4], [222, 58, 6], [248, 46, -5]],
      valleys: [30, 34, 28, 33, 30, 35, 29, 33, 31, 28, 34, 30, 32, 29],
    },
    crash: {
      arms: [[-80, 50], [-15, 38], [35, 52], [100, 36], [160, 50], [230, 40]],
      kinks: [[0.6, 14], [0.8, 20]],
      middle: 30,
    },
  },
  switch: { width: 46, height: 26, thumb: 16, inset: 5 },
  sliderThumb: { size: 18 },
  ornament: { path: 'M6 0 L7.4 4.1 L11.7 4.1 L8.2 6.7 L9.5 10.8 L6 8.3 L2.5 10.8 L3.8 6.7 L0.3 4.1 L4.6 4.1 Z' },
  bookmarkMark: { width: 4, inset: 3, radius: '0' },
  paper: { corners: [0, 0.4, 0, 0.8] },
  focusRing: { width: 3, gap: 2 },
  choiceMark: { size: 20 },
  dieGlyph: { path: 'M1.5 1.5 L10.5 1.5 L10.5 10.5 L1.5 10.5 Z' },
  ink: { edge: 2, drop: 1, depth: 1.2, glow: 0, lettering: 1 },
  panel: {
    bar: 'fill', hatch: true, frame: 'solid', frameWidth: 3, badge: 'seal', float: 0,
    flourish: { kind: 'none', width: 0, height: 0, at: 'right' },
  },
  radius: 2,
  surface: {
    paper: 'ruins',
    halftone: { dot: 0.8, step: 4 },
    screentone: { line: 1, gap: 5, angle: 45 },
    rays: 0.5,
  },
  motion: { pace: 1.2, hop: 0.4 },
});

// The astral cut: a wizard's tower under the stars. Fine swallowtails, moon
// seals, an orb for the crest, glowing lines instead of solid shadows, stars,
// moons and sparkles for the gems, stars over the page.
const ASTRAL = deepFreeze({
  ...COMIC,
  ribbon: {
    panel: { notch: 0, pad: 14 },
    tile: { notch: 0, pad: 4 },
    ends: '0,0 0,100',
  },
  seal: { radius: '50%' },
  crest: {
    // A plaque, its corners cut round inwards.
    clip: 'polygon(90% 0, 91.3% 8%, 95% 13.9%, 100% 16%, 100% 84%, 95% 86.1%, 91.3% 92%, 90% 100%, 10% 100%, 8.7% 92%, 5% 86.1%, 0 84%, 0 16%, 5% 13.9%, 8.7% 8%, 10% 0)',
    edge: 2,
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
  bookmarkMark: { width: 4, inset: 4, radius: '0 6px 6px 0' },
  paper: { corners: [1, 1, 1, 1] },
  ink: { edge: 2, drop: 0, depth: 1.2, glow: 4, lettering: 0 },
  panel: {
    bar: 'rule', hatch: false, frame: 'double', frameWidth: 6, badge: 'bare', float: 1,
    flourish: { kind: 'stars', width: 96, height: 16, at: 'right' },
  },
  radius: 12,
  surface: {
    paper: 'moonrise',
    halftone: { dot: 1, step: 16 },
    screentone: { line: 1, gap: 8, angle: 30 },
    rays: 1,
  },
  motion: { pace: 1.1, hop: 0.6 },
});

// The pirate cut: a ship's deck. Long pennants, doubloon seals, a wooden
// sign for the crest, planks over the bars, a deck that rolls a little.
const PIRATE = deepFreeze({
  ...COMIC,
  ribbon: {
    panel: { notch: 16, pad: 24 },
    tile: { notch: 6, pad: 7 },
    ends: '10,0 5,7 1.3,25 0,50 1.3,75 5,93 10,100',
  },
  seal: { radius: '50%' },
  crest: {
    clip: 'polygon(4% 0, 96% 0, 100% 10%, 98% 50%, 100% 90%, 96% 100%, 4% 100%, 0 90%, 2% 50%, 0 10%)',
    edge: 3,
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
  panel: {
    bar: 'fill', hatch: true, frame: 'solid', frameWidth: 5, badge: 'seal', float: 0,
    flourish: { kind: 'none', width: 0, height: 0, at: 'right' },
  },
  ornament: { path: 'M1 0 L6 4.5 L11 0 L12 1 L7.5 6 L12 11 L11 12 L6 7.5 L1 12 L0 11 L4.5 6 L0 1 Z' },
  paper: { corners: [1.5, 0.5, 2, 0.75] },
  radius: 6,
  surface: {
    paper: 'tropics',
    halftone: { dot: 0.8, step: 6 },
    screentone: { line: 2, gap: 9, angle: 0 },
    rays: 0.8,
  },
  motion: { pace: 1, hop: 1.2 },
});

// The steampunk cut: a brass machine. Straight riveted plates, a hex nut for
// the crest, gears, bulbs and nuts for the gems, pinstripes over the bars.
const STEAMPUNK = deepFreeze({
  ...COMIC,
  ribbon: {
    panel: { notch: 0, pad: 14 },
    tile: { notch: 0, pad: 4 },
    ends: '0,0 0,100',
  },
  seal: { radius: '30%' },
  crest: {
    // A cartouche: a long plate pointed at each side.
    clip: 'polygon(7% 0, 93% 0, 100% 50%, 93% 100%, 7% 100%, 0 50%)',
    edge: 3,
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
  ink: { edge: 2, drop: 1, depth: 1, glow: 0, lettering: 0 },
  panel: {
    bar: 'fill', hatch: true, frame: 'double', frameWidth: 6, badge: 'seal', float: 1,
    flourish: { kind: 'rivets', width: 10, height: 10, at: 'ends' },
  },
  ornament: { path: 'M4.6 1.8 L4.8 0.1 L7.2 0.1 L7.4 1.8 L8.9 2.7 L10.5 2 L11.7 4.1 L10.3 5.1 L10.3 6.9 L11.7 7.9 L10.5 10 L8.9 9.3 L7.4 10.2 L7.2 11.9 L4.8 11.9 L4.6 10.2 L3.1 9.3 L1.5 10 L0.3 7.9 L1.7 6.9 L1.7 5.1 L0.3 4.1 L1.5 2 L3.1 2.7 Z' },
  bookmarkMark: { width: 4, inset: 3, radius: '0' },
  paper: { corners: [0.3, 0.3, 0.3, 0.3] },
  radius: 4,
  surface: {
    paper: 'foundries',
    halftone: { dot: 0.6, step: 5 },
    screentone: { line: 1, gap: 4, angle: 90 },
    rays: 0.6,
  },
  motion: { pace: 1.1, hop: 0.6 },
});

// The dwarven cut: a hall carved in the mountain. Plain hewn bars, chipped
// stone seals, a stone tablet for the crest, heavy ink, slow and heavy moves.
const DWARVEN = deepFreeze({
  ...COMIC,
  ribbon: {
    panel: { notch: 8, pad: 16 },
    tile: { notch: 4, pad: 6 },
    ends: '0,0 0,35 10,35 10,65 0,65 0,100',
  },
  seal: { radius: '18% 26% 22% 14%' },
  crest: {
    clip: 'polygon(12% 0, 88% 0, 100% 14%, 100% 100%, 0 100%, 0 14%)',
    edge: 4,
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
  bookmarkMark: { width: 5, inset: 3, radius: '0' },
  paper: { corners: [0.5, 0.25, 0.5, 0.25] },
  ink: { edge: 3, drop: 1.2, depth: 1, glow: 0, lettering: 0 },
  panel: {
    bar: 'fill', hatch: true, frame: 'solid', frameWidth: 4, badge: 'bare', float: 0,
    flourish: { kind: 'none', width: 0, height: 0, at: 'right' },
  },
  radius: 3,
  surface: {
    paper: 'caverns',
    halftone: { dot: 1.2, step: 9 },
    screentone: { line: 3, gap: 10, angle: 0 },
    rays: 0.7,
  },
  motion: { pace: 1.3, hop: 0.5 },
});

// The fey cut: a grove where the fair folk dance. Vine swallowtails, petal
// seals, a scalloped arch of leaves for the crest, a soft glow, flowers,
// mushrooms and leaves for the gems, fireflies over the page, bouncy moves.
const FEY = deepFreeze({
  ...COMIC,
  ribbon: {
    panel: { notch: 0, pad: 14 },
    tile: { notch: 0, pad: 4 },
    ends: '0,0 0,100',
  },
  seal: { radius: '50% 50% 50% 8%' },
  crest: {
    clip: 'polygon(0 100%, 0 12%, 4.2% 7.4%, 8.3% 3.5%, 12.5% 0.9%, 16.7% 0, 20.8% 0.9%, 25% 3.5%, 29.2% 7.4%, 33.3% 12%, 37.5% 7.4%, 41.7% 3.5%, 45.8% 0.9%, 50% 0, 54.2% 0.9%, 58.3% 3.5%, 62.5% 7.4%, 66.7% 12%, 70.8% 7.4%, 75% 3.5%, 79.2% 0.9%, 83.3% 0, 87.5% 0.9%, 91.7% 3.5%, 95.8% 7.4%, 100% 12%, 100% 100%)',
    edge: 3,
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
  bookmarkMark: { width: 5, inset: 4, radius: '0 8px 8px 0' },
  paper: { corners: [2, 1, 2, 1] },
  ink: { edge: 2, drop: 0.8, depth: 1, glow: 2, lettering: 0.5 },
  panel: {
    bar: 'rule', hatch: false, frame: 'solid', frameWidth: 3, badge: 'seal', float: 1,
    flourish: { kind: 'vine', width: 96, height: 22, at: 'right' },
  },
  radius: 14,
  surface: {
    paper: 'enchanted',
    halftone: { dot: 1.4, step: 14 },
    screentone: { line: 1, gap: 6, angle: 60 },
    rays: 1,
  },
  motion: { pace: 1.2, hop: 1.4 },
});

// The cosmic cut: something vast beneath the waves. Torn swallowtails,
// shapeless seals, a warped slab for the crest, a faint sickly glow, eyes and
// tentacles for the gems, slow and uneasy moves.
const COSMIC = deepFreeze({
  ...COMIC,
  ribbon: {
    panel: { notch: 0, pad: 14 },
    tile: { notch: 0, pad: 4 },
    ends: '0,0 0,100',
  },
  seal: { radius: '58% 42% 63% 37% / 41% 56% 44% 59%' },
  crest: {
    clip: 'polygon(6% 4%, 30% 0, 52% 5%, 74% 0, 96% 6%, 100% 34%, 95% 62%, 100% 92%, 72% 100%, 48% 95%, 24% 100%, 2% 94%, 5% 64%, 0 34%)',
    edge: 3,
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
  paper: { corners: [0.5, 2, 1, 1.5] },
  ink: { edge: 2, drop: 0.6, depth: 1.4, glow: 3, lettering: 0 },
  panel: {
    bar: 'rule', hatch: false, frame: 'solid', frameWidth: 2, badge: 'bare', float: 1,
    flourish: { kind: 'tentacle', width: 90, height: 22, at: 'right' },
  },
  radius: 6,
  surface: {
    paper: 'depths',
    halftone: { dot: 1, step: 11 },
    screentone: { line: 1, gap: 5, angle: 15 },
    rays: 0.4,
  },
  motion: { pace: 1.4, hop: 0.3 },
});

// The pixel cut: an 8-bit cartridge. Square everything, stepped corners,
// pixel coins, potions and hearts for the gems, scanlines over the bars,
// snappy moves.
const PIXEL = deepFreeze({
  ...COMIC,
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
  bookmarkMark: { width: 4, inset: 0, radius: '0' },
  paper: { corners: [0, 0, 0, 0] },
  dieGlyph: { path: 'M1.5 1.5 L10.5 1.5 L10.5 10.5 L1.5 10.5 Z' },
  ink: { edge: 3, drop: 1, depth: 1, glow: 0, lettering: 1 },
  panel: {
    bar: 'fill', hatch: true, frame: 'solid', frameWidth: 3, badge: 'seal', float: 0,
    flourish: { kind: 'none', width: 0, height: 0, at: 'right' },
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

// The cyberpunk cut: a megacity's interface. The console's build cut harder:
// bars and crests with their corners sliced off, data shards, energy bolts
// and slanted marks for the gems, a glitch on the titles, scanlines, snappy
// moves.
const CYBERPUNK = deepFreeze({
  ...SCIFI,
  ribbon: {
    panel: { notch: 10, pad: 18 },
    tile: { notch: 5, pad: 7 },
    ends: '0,0 0,55 10,100',
  },
  seal: { radius: '0 8px 0 8px' },
  crest: {
    // Two corners sliced off, as a cut plate of armour.
    clip: 'polygon(0 0, 84% 0, 100% 22%, 100% 100%, 16% 100%, 0 78%)',
    edge: 2,
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
  bookmarkMark: { width: 4, inset: 2, radius: '0' },
  paper: { corners: [0, 1.5, 0, 1.5] },
  dieGlyph: { path: 'M3 0.5 H11.5 V9 L9 11.5 H0.5 V3 Z' },
  ink: { edge: 1.5, drop: 1, depth: 1, glow: 0, lettering: 1 },
  panel: {
    bar: 'fill', hatch: true, frame: 'solid', frameWidth: 3, badge: 'bare', float: 0,
    flourish: { kind: 'glitch', width: 84, height: 14, at: 'right' },
  },
  radius: 2,
  surface: {
    paper: 'megacity',
    halftone: { dot: 0.7, step: 4 },
    screentone: { line: 1, gap: 3, angle: 0 },
    rays: 0.5,
  },
  motion: { pace: 0.6, hop: 0.3 },
});

// The looks' styles the viewer can choose from (the "Style" of the account
// menu's theme panel), each with the palette it is drawn in for each mode
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
  cosmic: Object.freeze({ id: 'cosmic', label: 'Cosmic horror', palettes: Object.freeze({ dark: 'abyss', light: 'asylum' }), shapes: COSMIC }),
  pixel: Object.freeze({ id: 'pixel', label: 'Pixel retro', palettes: Object.freeze({ dark: 'arcade', light: 'cartridge' }), shapes: PIXEL }),
  cyberpunk: Object.freeze({ id: 'cyberpunk', label: 'Cyberpunk', palettes: Object.freeze({ dark: 'overdrive', light: 'daylight' }), shapes: CYBERPUNK }),
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
    '--gb-shape-kapow-aspect': String(shapes.bursts.kapow.width / 100),
    '--gb-shape-crash-aspect': '1',
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
