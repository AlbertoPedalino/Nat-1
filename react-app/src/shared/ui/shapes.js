// The interface's cut shapes, every one in this file: a panel bar's ribbon,
// the wax seal an icon stands on, the ability scores' crest, a tab's bookmark,
// the gems' cuts, the segments of a meter, the bursts behind a roll that
// shouts, a switch, a slider's thumb, the ornament on a card's rule, the
// bookmark that marks a chosen row, the focus ring, the marks of a checkbox
// and a radio and the die on a dice formula. With
// the palette (colors.js, entityColors.js), the type (fonts.js,
// textStyles.js), the ink (shadows.js) and the drawings (gameIcons.js) this
// is the whole look: a new theme recuts its shapes here, and every panel,
// tile, tab, gem, bar and burst follows. The components that draw them
// (PanelHeader, StatTile, GemPip, SegmentedMeter, bubble.js, CountSeal,
// CardSection, the theme's tabs, switches and sliders) hold no shape of their
// own (guarded).

// A panel bar's ribbon: each end notched in a swallowtail `notch` px deep,
// the ends widened by `px` (theme units) to clear it. A stat tile's is
// shallower and slimmer, so its name (Armor Class, Inspiration) keeps the room.
export const RIBBON = Object.freeze({
  panel: Object.freeze({ notch: 10, px: 2.25 }),
  tile: Object.freeze({ notch: 4, px: 0.625 }),
});

// The ribbon's cut for a notch `notch` px deep: a swallowtail at each end.
export function ribbonClip(notch) {
  return `polygon(0 0, 100% 0, calc(100% - ${notch}px) 50%, 100% 100%, 0 100%, ${notch}px 50%)`;
}

// A wax seal's edge: round, but not perfectly, as if pressed by hand. The
// badge an icon stands on (a panel's, a tool's on the home page) takes it.
export const SEAL_RADIUS = '46% 54% 48% 52% / 55% 45% 55% 45%';

// The ability scores' crest: square shoulders, a point at the foot. `edge` is
// its ink (px), `foot` the room its figures keep clear of the point (a share
// of the crest's width).
export const CREST = Object.freeze({
  clip: 'polygon(0 0, 100% 0, 100% 80%, 50% 100%, 0 80%)',
  edge: 3,
  foot: '22%',
});

// A tab is a notebook's bookmark: rounded at the top, open at the foot where
// it stands on its bar's ruled line; the open one rises by `rise` px. `gap`
// spaces the bookmarks.
export const BOOKMARK_TAB = Object.freeze({
  radius: '8px 8px 0 0',
  rise: 4,
  gap: 4,
});

// The gems' cuts, in a 100-unit box: `sides`, the outline and the table (the
// flat top facet) as centre x, centre y, radius x, radius y — the table set up
// and left so the facets round it catch the light unevenly — and how far the
// solid shadow drops. A counter's gem (a slot, a use, a hit die) is a
// hexagon; a training mark's (a skill's, a save's) a four-sided diamond, so a
// mark that is read never looks like a gem that is spent.
export const GEM_CUTS = Object.freeze({
  counter: Object.freeze({ sides: 6, outer: [50, 46, 44, 45], inner: [47, 43, 23, 23.5], shadowDrop: 6 }),
  training: Object.freeze({ sides: 4, outer: [50, 46, 38, 46], inner: [47, 42, 17, 21], shadowDrop: 6 }),
});

// How many segments a meter is cut into: a bar on a page, a piece's bar a
// few pixels tall on the map, none for a smooth strip (XP).
export const METER_SEGMENTS = Object.freeze({
  bar: 10,
  piece: 5,
  smooth: 0,
});

// The bursts behind a total that shouts (bubble.js). The natural 20's KAPOW:
// `width` units wide by 100 tall, squashed by `squash`, sharp spikes of a few
// lengths each leaning a little ([angle, reach, lean] in degrees and units),
// valleys of a few depths. The natural 1's crash: six arms of different reach
// ([angle, reach]), each kinked along its trailing edge ([share of reach,
// degrees off]), round a full `middle` the number sits inside.
export const BURSTS = Object.freeze({
  kapow: Object.freeze({
    width: 130,
    squash: 0.78,
    spikes: [[-90, 64, 4], [-62, 52, -3], [-38, 62, 5], [-14, 50, 0], [8, 60, -4], [32, 54, 3], [58, 63, 6], [84, 50, -2], [108, 61, 4], [134, 53, -5], [158, 64, 3], [182, 51, 0], [206, 62, -4], [232, 52, 4]],
    valleys: [37, 40, 36, 39, 38, 35, 40, 37, 39, 36, 38, 40, 36, 39],
  }),
  crash: Object.freeze({
    arms: [[-85, 48], [-20, 42], [40, 47], [110, 40], [170, 48], [235, 43]],
    kinks: [[0.74, 8], [0.84, 13]],
    middle: 33,
  }),
});

// An on/off switch (every ToggleRow): a rounded track `width` by `height` px,
// a round thumb `thumb` px across set `inset` px inside it, sliding across.
export const SWITCH = Object.freeze({ width: 46, height: 28, thumb: 18, inset: 5 });

// A slider's thumb (every LabeledSlider): a wax seal `size` px across, the
// seal's own edge (SEAL_RADIUS).
export const SLIDER_THUMB = Object.freeze({ size: 18 });

// The ornament set on the middle of a card's rule (CardSection): a small
// diamond, as a printed rulebook sets a fleuron between its parts. `path` is
// drawn in a `size` px box.
export const ORNAMENT = Object.freeze({ path: 'M6 0 L12 6 L6 12 L0 6 Z', size: 12 });

// The bookmark on the left edge of a chosen row and of a menu item under the
// pointer, as a tab's: `width` px, `inset` px from the row's top and foot.
export const BOOKMARK_MARK = Object.freeze({ width: 5, inset: 4, radius: '0 4px 4px 0' });

// A sheet of paper laid on the interface (SURFACES.paper): its corners cut
// unevenly as a torn-out page's, in theme radius units (top left, top right,
// bottom right, bottom left).
export const PAPER = Object.freeze({ corners: [0.75, 1.75, 0.75, 1.75] });

// The keyboard's focus: a gold ring `width` px round what has it, set `gap` px
// off, with the ink shadow widened round it.
export const FOCUS_RING = Object.freeze({ width: 3, gap: 2 });

// A checkbox's box and a radio's seal (ChoiceMarks): `size` px across.
export const CHOICE_MARK = Object.freeze({ size: 20 });

// The die drawn before a dice formula in the text ("8d6"): a hexagon, `path`
// in a `size` px box.
export const DIE_GLYPH = Object.freeze({ path: 'M6 0.5 L11.5 3.5 L11.5 8.5 L6 11.5 L0.5 8.5 L0.5 3.5 Z', size: 12 });
