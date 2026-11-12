import { VTT_COLORS, vttAlpha } from '../../../shared/vtt/colors.js';
import { FONT_SIZES } from '../../../shared/ui/fonts.js';
import { TEXT_STYLES } from '../../../shared/ui/textStyles.js';
import { OPACITY } from '../../../shared/ui/colors.js';
import { SURFACES } from '../../../shared/ui/surfaces.js';
import { CONTROL_HEIGHTS } from '../../../shared/ui/controlHeights.js';
import { PRESSABLE_EDGE_SX } from '../../../shared/ui/pressable.js';

// The battle map's own recipes: what sits on the board itself. A dialog over
// the map is SheetDialog with `surface="map"`, a menu is MapMenu, a floating
// panel MapFloatingPanel; their paper is shared/ui/mapPaper.js.

// The round icon buttons on the map (Rolls, the tools toggle, fullscreen, the
// corner toggles, the folded background strip): one raised control.
export const mapIconButtonSx = {
  ...SURFACES.mapControl,
  ...PRESSABLE_EDGE_SX,
  color: VTT_COLORS.accent,
  '&:hover': { ...PRESSABLE_EDGE_SX['&:hover'], bgcolor: vttAlpha(VTT_COLORS.surface, OPACITY.solid) },
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

// The small icon buttons in a panel's title row (settings, close): quiet until
// the cursor is on them.
export const mapPanelButtonSx = {
  color: VTT_COLORS.textSecondary,
  p: 0.5,
  '&:hover': { color: 'primary.main' },
};

// The compact text field of the map's menus.
export const battleMapCompactFieldSx = {
  '& .MuiInputBase-root': { height: CONTROL_HEIGHTS.xl, fontSize: FONT_SIZES.md },
  '& .MuiInputLabel-root': { fontSize: FONT_SIZES.sm },
  '& .MuiInputLabel-shrink': { transform: 'translate(14px, -7px) scale(0.75)' },
};
