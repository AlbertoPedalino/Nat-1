import { VTT_COLORS, vttAlpha } from '../../../shared/vtt/colors.js';
import { UI_FONTS, FONT_SIZES, LETTER_SPACINGS } from '../../../shared/ui/fonts.js';
import { UI_SHADOWS } from '../../../shared/ui/shadows.js';

// Shared glass surface for every control floating over the battle map. Keeping
// the rail and its dialogs on the same tokens prevents ordinary MUI paper from
// appearing as a solid block beside the translucent toolbar.
export const battleMapSurfaceSx = {
  bgcolor: 'gmboard.vtt.surface',
  backgroundImage: 'none',
  border: '1px solid',
  borderColor: 'gmboard.vtt.accentBorder',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
};

// The round icon buttons on the map (Rolls, the tools toggle, fullscreen).
export const mapIconButtonSx = {
  color: VTT_COLORS.accent,
  bgcolor: vttAlpha(VTT_COLORS.surface, 0.8),
  border: `1px solid ${vttAlpha(VTT_COLORS.accent, 0.35)}`,
  '&:hover': { bgcolor: vttAlpha(VTT_COLORS.surface, 0.95) },
};

export const battleMapDialogPaperSx = {
  ...battleMapSurfaceSx,
  borderRadius: 1,
  boxShadow: UI_SHADOWS.overlay,
  transition: 'opacity 140ms ease',
};

// Placement sources stay mounted and stationary while the surface fades out,
// revealing the board without disturbing the active pointer sequence.
export const battleMapDialogPlacingPaperSx = {
  opacity: 0,
  pointerEvents: 'none',
};

export const battleMapDialogTitleSx = {
  bgcolor: 'transparent',
  borderBottom: '1px solid',
  borderBottomColor: 'gmboard.vtt.accentBorder',
  color: 'primary.main',
  fontFamily: UI_FONTS.display,
  fontSize: FONT_SIZES.xl,
  fontWeight: 700,
  letterSpacing: LETTER_SPACINGS.lg,
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
  bgcolor: vttAlpha(VTT_COLORS.black, 0.16),
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
  '& .MuiInputBase-root': { height: 34, fontSize: FONT_SIZES.md },
  '& .MuiInputLabel-root': { fontSize: FONT_SIZES.sm },
  '& .MuiInputLabel-shrink': { transform: 'translate(14px, -7px) scale(0.75)' },
};

export const battleMapCheckboxRowSx = {
  m: 0,
  minHeight: 24,
  '& .MuiCheckbox-root': { p: 0.35, mr: 0.25 },
  '& .MuiSvgIcon-root': { width: 17, height: 17 },
};

export const battleMapControlLabelSx = { fontSize: FONT_SIZES.sm, lineHeight: 1.2 };

