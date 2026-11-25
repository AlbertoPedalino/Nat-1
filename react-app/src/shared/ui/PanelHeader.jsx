import { Box, Typography } from '@mui/material';
import { UI_COLORS, panelScreentone } from './colors.js';
import { FONT_SIZES, LINE_HEIGHTS } from './fonts.js';
import { ONE_LINE_SX, TEXT_STYLES } from './textStyles.js';
import { SURFACES, surfaceFinish } from './surfaces.js';
import { ICON_SIZES } from './iconSizes.js';
import { INK_SOLID, PLAIN_LETTERING, inkLettering } from './shadows.js';
import { RIBBON, SEAL_RADIUS } from './shapes.js';
import { svgStylePicture } from './svgPicture.js';
import { barEndInkSvg, flourishSvg } from './panelOrnaments.js';
import { GRIP_ROOM } from './panelGrip.js';
import PanelGrip from './PanelGrip.jsx';
import { BANNER_HEIGHT, BANNER_INSET, bannerSlip, bannerTab, bannerTitle, tileBanner, tileBannerTitle } from './panelBanner.js';
import MeasuredDrawing from './MeasuredDrawing.jsx';
import PanelBanner from './PanelBanner.jsx';
import { inkOn } from './pressable.js';
import { useStyleShapes } from './themeIds.js';
import { useRootStyle } from './liveStyle.js';
import { useFitText } from './useFitText.js';

// The title bar of a panel (Saving Throws, Skills, Senses, Movement,
// Proficiencies, a builder step) and of SheetDialog: a header-tint bar over an
// ink line, its icon on a small badge of the panel's colour, an uppercase
// title. `tone` colours the badge and the title (Movement turns orange under a
// penalty); `children` go at the end.

// How the style builds a panel (shapes.js panel) is written on the page's
// root as whole values (surfaces.js panelVariables), so every recipe here is
// made once and follows the chosen style.

export const panelBarSx = {
  display: 'flex',
  alignItems: 'center',
  gap: 1,
  // The header's paper, or none: a title over a rule (the style's bar).
  bgcolor: 'var(--gb-panel-bar-paper)',
  borderBottom: INK_SOLID,
  borderColor: UI_COLORS.edge,
};

// A panel's bar cut as the style cuts it (RIBBON, shapes.js ribbon.ends): the
// comic's swallowtail, a spear point, a scroll's roll, a pixel stair, `notch`
// deep (the style's, a CSS length), each cut end inked like every edge, all
// inside the bar's own box (an ornament poking out of a panel is cut by its
// frame and grows scrollbars). Spread after the bar's padding: it widens the
// ends (`pad`) to clear the notch.
const END_INK = Object.freeze({
  left: svgStylePicture('panel-end-left', (shapes) => barEndInkSvg(shapes.ribbon.ends, 'left')),
  right: svgStylePicture('panel-end-right', (shapes) => barEndInkSvg(shapes.ribbon.ends, 'right')),
});
function notchInk(side, notch) {
  // Drawn in a box of its own stretched over the notch (no aspect kept, the
  // ink never scaled), so one picture fits every depth of notch.
  return {
    content: '""',
    position: 'absolute',
    [side]: 0,
    top: 0,
    // Down over the bar's bottom border, as the clip is.
    bottom: -2,
    width: notch,
    backgroundImage: END_INK[side],
    backgroundSize: '100% 100%',
    pointerEvents: 'none',
  };
}
function ribbonSx({ notch, pad, clip }) {
  return {
    position: 'relative',
    px: pad,
    clipPath: clip,
    '&::before': notchInk('left', notch),
    '&::after': notchInk('right', notch),
  };
}

// A title's flourish, as the style draws it (shapes.js panel.flourish): a
// line of stars, a vine, a glitch at the bar's right end, a rivet at each
// end; at no size where the style has none.
const FLOURISH = svgStylePicture('panel-flourish', (shapes) => flourishSvg(shapes.panel.flourish.kind));

const PANEL_RIBBON_SX = ribbonSx(RIBBON.panel);
const TILE_RIBBON_SX = ribbonSx(RIBBON.tile);

// The title bar of every panel, whole: the bar, its padding, its ribbon cut
// and its screentone in `tone`. PanelHeader, a stat tile (`tile`: a
// narrower notch), the sheet's tab bar and a dialog's title all take it, so a
// restyle of the bar reaches every one; nothing outside this file builds a
// panel's bar from the pieces.
export function panelTitleBarSx(tone = UI_COLORS.accent, { tile = false } = {}) {
  return {
    ...panelBarSx,
    ...panelBarPadSx,
    ...(tile ? TILE_RIBBON_SX : PANEL_RIBBON_SX),
    // The rule under the bar: the ink, or the panel's tone under a bar that
    // is only a rule.
    borderColor: `var(--gb-panel-bar-rule, ${tone})`,
    // The flourish (twice: at one end or at each) over the screentone, or
    // none (shapes.js panel.hatch). A tile's narrow bar has no room for one.
    ...(tile ? { backgroundImage: panelScreentone(tone), backgroundSize: 'var(--gb-panel-bar-hatch)' } : {
      backgroundImage: `${FLOURISH}, ${FLOURISH}, ${panelScreentone(tone)}`,
      backgroundSize: 'var(--gb-panel-flourish-size), var(--gb-panel-flourish-size-2), var(--gb-panel-bar-hatch)',
      backgroundPosition: 'var(--gb-panel-flourish-at), var(--gb-panel-flourish-at-2), 0 0',
      backgroundRepeat: 'no-repeat, no-repeat, repeat',
    }),
  };
}

// A panel bar that holds the panel's tabs (the sheet's tabs, the builder's
// steps): the tabs' ruled line is the bar's bottom edge, so the bar keeps no
// padding nor border of its own under them.
export function panelTabBarSx(tone = UI_COLORS.accent) {
  return { ...panelTitleBarSx(tone), py: 0, borderBottom: 0, alignItems: 'flex-end' };
}

// The icon's badge in a panel bar: a wax seal in the tone, edged in ink, its
// game drawing large enough to read (PANEL_BADGE_ICON); or, as the style
// draws it (shapes.js panel.badge 'bare'), the drawing alone in the tone.
export const PANEL_BADGE_ICON = ICON_SIZES.xl;
// The badge's outer size: its icon, 4px of padding (the seal is round: the
// drawing keeps clear of its edge) and 2px of edge a side. A bar without a
// badge (a stat tile's) holds this height to line up with one.
const PANEL_BADGE_BOX = PANEL_BADGE_ICON + 12;

// The room round a panel bar's badge, the same for every bar (a PanelHeader,
// the sheet's tab bar).
const panelBarPadSx = { px: '0.8rem', py: '0.36rem' };

export function panelBadgeSx(tone = UI_COLORS.accent) {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    p: 0.5,
    borderRadius: SEAL_RADIUS,
    bgcolor: `var(--gb-panel-badge-fill, ${tone})`,
    color: `var(--gb-panel-badge-ink, ${tone})`,
    border: 'var(--gb-panel-badge-edge)',
    // The seal's solid ink shadow, as under every drawn box.
    boxShadow: 'var(--gb-panel-badge-shadow)',
    flexShrink: 0,
  };
}

export const panelTitleSx = {
  ...TEXT_STYLES.heading,
  fontSize: FONT_SIZES.body,
  color: 'primary.main',
};

// A main panel (a sheet panel, a builder step's panel): the comic panel's
// thicker ink frame and its solid shadow (as the style frames and floats it). Boxes inside it keep the thinner
// edge, so the panels read first.
//
// From md up each main panel is drawn on a layer of its own. Where a card
// opens or a list grows, the page is repainted in strips as wide as the
// window, panels that do not move included: on a 1920px desktop two of every
// three frames of a card's opening were dropped (24ms a frame). On their own
// layers the panels keep their drawing and only move: 13.3ms, none dropped.
// A layer is a containing block for `position: fixed`, so what floats over
// the page (menus, toasts, dialogs) portals out of the panel, as it already
// does. A phone, with one narrow column, was smooth without.
//
// A page whose panels sit over a board that moves (the battle map) turns the
// layers off for every panel on it, portalled ones included (the compendium
// side panel), with usePanelsWithoutLayers: there twenty layers over the
// moving board doubled the dropped frames of a pan. The one switch, on the
// document root while that page is open.
const PANEL_LAYER_VAR = '--gb-panel-layer';

export function usePanelsWithoutLayers() {
  useRootStyle({ [PANEL_LAYER_VAR]: 'auto' });
}

export const panelFrameSx = {
  // The style's frame (shapes.js panel.frame, frameWidth), scaled with its ink.
  border: `calc(var(--gb-panel-frame-width) * var(--gb-ink-line)) var(--gb-panel-frame-style) ${UI_COLORS.edge}`,
  boxShadow: 'var(--gb-panel-shadow)',
  // Shaded as the style lights a main panel (surfaces.js SURFACE_FINISHES).
  backgroundImage: surfaceFinish('panel'),
  // What is in it kept inside its frame; or let past it where the style grips
  // the panel (shapes.js panel.grip), the drawing reaching over its edges.
  // Either way the panel shrinks in a row or a column as a clipped one does.
  overflow: 'var(--gb-panel-overflow)',
  minWidth: 0,
  minHeight: 0,
  willChange: { md: `var(${PANEL_LAYER_VAR}, transform)` },
};

// The name on a card or row (an action, a chosen species or background): the
// body face, bold, a step over the body text.
export const cardTitleSx = {
  ...TEXT_STYLES.cardName,
  // Small capitals stand lower than capitals: a step up, as item and spell
  // cards already letter their names.
  fontSize: FONT_SIZES.xxl,
  color: 'text.primary',
};

// The body of a panel under its PanelHeader.
export const panelBodySx = { px: 1, py: 0.75 };

// The caption over a group of controls or a list (a selector's name, a
// history's title): small, uppercase, quiet.
export const captionLabelSx = {
  ...TEXT_STYLES.label,
  fontSize: FONT_SIZES.sm,
  color: 'text.secondary',
};

// The smallest caption, inside a result line (a step's kind, a field name).
export const microLabelSx = {
  ...TEXT_STYLES.label,
  fontSize: FONT_SIZES.xs,
  color: 'text.secondary',
};

// The heading of a group of rows on a sheet tab (a spell level, an inventory
// section, a feature list): uppercase, over a rule. `color` tints the text,
// `rule` the line under it (null: no line).
export function sheetSectionHeaderSx({ color = 'text.secondary', rule = 'divider' } = {}) {
  return {
    ...TEXT_STYLES.label,
    fontSize: FONT_SIZES.sm,
    color,
    ...(rule ? { borderBottom: 1, borderColor: rule, pb: 0.5 } : {}),
  };
}

// A framed box on the sheet (Conditions, Reminders, Defenses, the ability
// scores, hit points): the header tint inside a thin border. Its title is
// sheetBoxTitleSx, the panel title's lettering.
export const sheetBoxSx = {
  ...SURFACES.panel, 
};

export const sheetBoxTitleSx = { ...panelTitleSx, mb: 0.5 };

// A sheet readout: a big gold number over its tiny uppercase name (AC,
// Initiative, Speed).
// The side of a stat tile (Initiative, Proficiency Bonus, Inspiration) and the
// width of the AC shield beside them: big enough to find at a glance.
export const STAT_TILE_SIZE = 80;

export const statValueSx = {
  ...TEXT_STYLES.figure,
  fontSize: FONT_SIZES.display,
  color: UI_COLORS.accentText,
  lineHeight: LINE_HEIGHTS.none,
};

// The name at the start of a row of values on a card (Status, Uses, Free
// Cast).
export const inlineMetaLabelSx = {
  fontSize: FONT_SIZES.xxs,
  color: 'text.secondary',
  ...TEXT_STYLES.label,
};

// The small uppercase label of a section inside a panel.
export const sectionLabelSx = {
  ...TEXT_STYLES.label,
  fontSize: FONT_SIZES.xxxs,
};

// `titleSx` resizes the title for a page whose panels are its main content (the
// builder); the sheet keeps panelTitleSx as it is.
// A bar the style grips (shapes.js panel.grip): the drawing over its top edge,
// room kept for it over the title, the bar's ends uncut so it reaches past
// them.
// A bar something is drawn over or across: its ends uncut (no ribbon clip, no
// ink along the cut), so the drawing reaches past them.
const UNCUT_BAR_SX = {
  clipPath: 'none',
  '&::before, &::after': { display: 'none' },
};

const GRIPPED_BAR_SX = {
  ...UNCUT_BAR_SX,
  pt: `calc(${panelBarPadSx.py} + ${GRIP_ROOM}px)`,
};

// A bar the style draws as a banner (shapes.js panel.banner): the drawing in
// place of the bar's paper, screentone, cut ends and rule. The banner spans
// the bar's badge, title and count (BANNER_ZONE_SX), from end to end of the
// bar, so it is set in (or reaches past) both sides alike; the bar's action
// stands after it on the panel, never on the drawing, with the bar's room
// after it, only while the action shows something (a Clear with nothing to
// clear draws nothing and keeps no room).
const PANEL_ACTION = '[data-panel-action]';
const BANNER_BAR_SX = {
  ...UNCUT_BAR_SX,
  bgcolor: 'transparent',
  backgroundImage: 'none',
  borderBottom: 0,
  px: 0,
  [`&:has(> ${PANEL_ACTION}:not(:empty))`]: { pr: '0.8rem' },
};

// The box of a bar's action, gone while the action draws nothing.
const PANEL_ACTION_SX = { ml: 'auto', flexShrink: 0, '&:empty': { display: 'none' } };

// What the banner is drawn across, behind (its own layer: the drawing goes
// under the badge and the title), kept in from the banner's ends; its title
// sized to it (bannerTitleSx).
const BANNER_ZONE_SX = {
  position: 'relative',
  isolation: 'isolate',
  flex: 1,
  minWidth: 0,
  minHeight: BANNER_HEIGHT,
  display: 'flex',
  alignItems: 'center',
  gap: 1,
  pl: `${BANNER_INSET + 20}px`,
  pr: `${BANNER_INSET + 12}px`,
};

// The title lettered as the banner letters it (panelBanner.js BANNER_TITLES):
// the ink that reads on its drawing, or a colour of its own, printed plain
// (an inked outline and shadow would blot dark letters on a light banner),
// outlined in the drawing's colour where it is busy under the letters, or
// inked as the comic letters light letters on a deep banner (inkLettering).
// On one line, as a banner holds one: shrunk to a narrow bar (useFitText,
// measured in the style's own face) rather than wrapping out of the drawing,
// cut short only past that. Its box keeps room past the last letter and under the line for its
// ink (the outline, the shadow that falls right and down) and a slanted
// face's overhang, which the cut-short box would clip.
function bannerTitleSx({ on, color, halo, inked }, size) {
  const lettering = (inked && inkLettering(2, 2)) || (halo && inkLettering(2, 0, UI_COLORS[halo])) || PLAIN_LETTERING;
  return {
    color: color ? UI_COLORS[color] : inkOn(UI_COLORS[on]),
    ...lettering,
    ...ONE_LINE_SX,
    pr: '0.3em',
    pb: '0.12em',
    fontSize: size,
  };
}

// The label a banner letters its title on (panelBanner.js bannerSlip): drawn
// to the title's size, behind it, stuck on a little askew. And the tab it
// stands badge and title on (bannerTab): drawn to the size of the two.
const SLIP_SX = { position: 'relative', isolation: 'isolate', minWidth: 0, px: 1, py: 0.25, rotate: '-0.8deg' };
const TAB_SX = { position: 'relative', isolation: 'isolate', display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 };

// A stat tile's bar (StatTile): its name in `tone` on the bar every tile
// takes (panelTitleBarSx), or on what the style draws in the bar's place
// (shapes.js panel.tileBanner, panelBanner.js), lettered as that drawing
// letters it.
const DRAWN_TILE_BAR_SX = { ...UNCUT_BAR_SX, position: 'relative', isolation: 'isolate', bgcolor: 'transparent', backgroundImage: 'none', borderBottom: 0 };
export function TileBar({ tone, titleRef, children }) {
  const { tileBanner: kind } = useStyleShapes().panel;
  const lettering = tileBannerTitle(kind);
  return (
    <Box sx={[panelTitleBarSx(tone, { tile: true }), TILE_BAR_SX, lettering && DRAWN_TILE_BAR_SX]}>
      {lettering ? <MeasuredDrawing draw={(w, h) => tileBanner(kind, w, h)} /> : null}
      <Box sx={{ width: 0, height: PANEL_BADGE_BOX, flexShrink: 0 }} />
      <Typography ref={titleRef} noWrap sx={{ ...panelTitleSx, color: tone, minWidth: 0, ...(lettering ? bannerTitleSx(lettering, panelTitleSx.fontSize) : null) }}>{children}</Typography>
    </Box>
  );
}
const TILE_BAR_SX = { gap: 0, justifyContent: 'center' };

// `children` follow the title (a count); `action` stands at the bar's end.
export default function PanelHeader({ icon: Icon, title, tone = UI_COLORS.accent, titleSx, action, children }) {
  const { grip, banner } = useStyleShapes().panel;
  const gripped = grip !== 'none';
  const lettering = bannerTitle(banner);
  const titleRef = useFitText(title, { enabled: !!lettering });
  const name = <Typography ref={titleRef} sx={{ ...panelTitleSx, ...titleSx, color: tone, ...(lettering ? bannerTitleSx(lettering, titleSx?.fontSize ?? panelTitleSx.fontSize) : null) }}>{title}</Typography>;
  const named = (
    <>
      {Icon ? <Box sx={panelBadgeSx(tone)}><Icon size={PANEL_BADGE_ICON} /></Box> : null}
      {lettering?.slip ? <Box sx={SLIP_SX}><MeasuredDrawing draw={(w, h) => bannerSlip(banner, w, h)} />{name}</Box> : name}
    </>
  );
  const heading = (
    <>
      {lettering?.tab ? <Box sx={TAB_SX}><MeasuredDrawing draw={(w, h) => bannerTab(banner, w, h)} />{named}</Box> : named}
      {children}
    </>
  );
  return (
    <Box sx={[panelTitleBarSx(tone), lettering && BANNER_BAR_SX, gripped && GRIPPED_BAR_SX]}>
      {gripped ? <PanelGrip kind={grip} /> : null}
      {lettering ? <Box sx={BANNER_ZONE_SX}><PanelBanner kind={banner} seed={typeof title === 'string' ? title : ''} />{heading}</Box> : heading}
      {action ? <Box data-panel-action sx={PANEL_ACTION_SX}>{action}</Box> : null}
    </Box>
  );
}
