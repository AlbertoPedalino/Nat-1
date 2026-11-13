import { VTT_COLORS } from '../../../shared/vtt/colors.js';
import { FONT_SIZES } from '../../../shared/ui/fonts.js';
import { TEXT_STYLES } from '../../../shared/ui/textStyles.js';
import { SURFACES } from '../../../shared/ui/surfaces.js';
import { CONTROL_HEIGHTS } from '../../../shared/ui/controlHeights.js';
import { PRESSABLE_EDGE_SX } from '../../../shared/ui/pressable.js';

// The battle map's own recipes: what sits on the board itself. A dialog over
// the map is SheetDialog with `surface="map"`, a menu is MapMenu, a floating
// panel MapFloatingPanel; their paper is shared/ui/mapPaper.js.

// The round icon buttons on the map (Rolls, the tools toggle, fullscreen, the
// corner toggles, the folded background strip): one raised control.
// Round, the board's own controls' shape (every other icon button is the
// theme's rounded square): a circle on a square button, a pill on a wider one
// (the dice pill, the folded backgrounds strip) — never an ellipse.
export const mapIconButtonSx = {
  ...SURFACES.mapControl,
  ...PRESSABLE_EDGE_SX,
  borderRadius: 999,
  color: VTT_COLORS.accent,
  // Its own solid surface under the cursor too (an icon button's hover would
  // otherwise lay a see-through wash over the board).
  '&:hover': { ...PRESSABLE_EDGE_SX['&:hover'], bgcolor: VTT_COLORS.surface },
};

// A panel floating over the board (the scene and hexcrawl corners, the tool
// rail's panel): the map's glass, padded, scrolling inside its own height
// rather than running off the bottom of a fullscreen map. Its caller only
// places and sizes it.
export const mapPanelSx = {
  ...SURFACES.map,
  borderRadius: 1,
  p: 1.25,
  minHeight: 0,
  overflowY: 'auto',
  cursor: 'default',
};

// The title of such a panel and of a map menu ("Scene", "Hexcrawl", "Circle ·
// Fire").
export const mapPanelTitleSx = {
  ...TEXT_STYLES.title,
  fontSize: FONT_SIZES.md,
  color: 'primary.main',
};

// The small icon buttons in a panel's title row (settings, close): the map's
// round control, a size down.
export const mapPanelButtonSx = {
  ...mapIconButtonSx,
  p: 0.5,
};

// A map panel's remove (a picture, a token's image): the panel button in the
// map's danger red.
export const mapDangerButtonSx = {
  ...mapPanelButtonSx,
  color: VTT_COLORS.danger,
};

// The compact text field of the map's menus.
export const battleMapCompactFieldSx = {
  '& .MuiInputBase-root': { height: CONTROL_HEIGHTS.xl, fontSize: FONT_SIZES.md },
  '& .MuiInputLabel-root': { fontSize: FONT_SIZES.sm },
  '& .MuiInputLabel-shrink': { transform: 'translate(14px, -7px) scale(0.75)' },
};
