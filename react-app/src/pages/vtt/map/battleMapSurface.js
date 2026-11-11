import { VTT_COLORS, vttAlpha } from '../../../shared/vtt/colors.js';
import { FONT_SIZES, LINE_HEIGHTS } from '../../../shared/ui/fonts.js';
import { UI_SHADOWS } from '../../../shared/ui/shadows.js';
import { TEXT_STYLES } from '../../../shared/ui/textStyles.js';
import { OPACITY } from '../../../shared/ui/colors.js';
import { SURFACES } from '../../../shared/ui/surfaces.js';
import { CONTROL_HEIGHTS } from '../../../shared/ui/controlHeights.js';
import { DURATIONS } from '../../../shared/ui/motion.js';
import { PRESSABLE_EDGE_SX } from '../../../shared/ui/pressable.js';
import { panelBarSx, panelScreentone } from '../../../shared/ui/PanelHeader.jsx';

// The round icon buttons on the map (Rolls, the tools toggle, fullscreen).
export const mapIconButtonSx = {
  ...SURFACES.mapControl,
  ...PRESSABLE_EDGE_SX,
  color: VTT_COLORS.accent,
  '&:hover': { ...PRESSABLE_EDGE_SX['&:hover'], bgcolor: vttAlpha(VTT_COLORS.surface, OPACITY.solid) },
};

export const battleMapDialogPaperSx = {
  ...SURFACES.map,
  borderRadius: 1,
  boxShadow: UI_SHADOWS.overlay,
  transition: `opacity ${DURATIONS.fast}ms ease`,
};

// Placement sources stay mounted and stationary while the surface fades out,
// revealing the board without disturbing the active pointer sequence.
export const battleMapDialogPlacingPaperSx = {
  opacity: 0,
  pointerEvents: 'none',
};

// A map dialog's title is a panel bar: the header tint over an ink line, with
// the screentone.
export const battleMapDialogTitleSx = {
  ...panelBarSx,
  backgroundImage: panelScreentone(VTT_COLORS.accent),
  color: 'primary.main',
  ...TEXT_STYLES.title,
  fontSize: FONT_SIZES.xl,
};

export const battleMapDialogContentSx = {
  bgcolor: 'transparent',
  borderColor: 'gmboard.vtt.accentTint',
};

export const battleMapDialogActionsSx = {
  bgcolor: 'transparent',
  borderTop: '1px solid',
  borderTopColor: 'gmboard.vtt.accentTint',
};

// Placement dialogs stay open while a piece is dragged, but only their paper
// should intercept the pointer. Outside it, the map remains a real drop target.
export const battleMapDropDialogSx = {
  pointerEvents: 'none',
  '& .MuiDialog-paper': { pointerEvents: 'auto' },
};

export const battleMapDropBackdropSx = {
  pointerEvents: 'none',
  bgcolor: vttAlpha(VTT_COLORS.black, OPACITY.fill),
};

// The paper of a menu opened over the map (the piece menu, the drawing menu):
// the dialog surface at `width`, inside the visible window. Of the visible
// window, not 100vh: on a phone 100vh is taller than the screen while the
// browser bar shows, and a menu that tall gets pushed up past the top edge.
// 32px leaves Popover's 16px margins.
export function battleMapMenuPaperSx(width) {
  return {
    ...battleMapDialogPaperSx,
    width,
    maxWidth: 'calc(100vw - 16px)',
    maxHeight: 'calc(100% - 32px)',
    '& .MuiMenu-list': { p: 0 },
  };
}

// The compact controls of those menus: a short text field, a checkbox row and
// its label.
export const battleMapCompactFieldSx = {
  '& .MuiInputBase-root': { height: CONTROL_HEIGHTS.xl, fontSize: FONT_SIZES.md },
  '& .MuiInputLabel-root': { fontSize: FONT_SIZES.sm },
  '& .MuiInputLabel-shrink': { transform: 'translate(14px, -7px) scale(0.75)' },
};

export const battleMapCheckboxRowSx = {
  m: 0,
  minHeight: CONTROL_HEIGHTS.md,
  '& .MuiCheckbox-root': { p: 0.25, mr: 0.25 },
  '& .MuiSvgIcon-root': { width: 17, height: 17 },
};

export const battleMapControlLabelSx = { fontSize: FONT_SIZES.sm, lineHeight: LINE_HEIGHTS.tight };

