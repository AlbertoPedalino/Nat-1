import { VTT_COLORS, vttAlpha } from '../../../shared/vtt/colors.js';
import { UI_FONTS } from '../../../shared/ui/fonts.js';

// Shared glass surface for every control floating over the battle map. Keeping
// the rail and its dialogs on the same tokens prevents ordinary MUI paper from
// appearing as a solid block beside the translucent toolbar.
export const battleMapSurfaceSx = {
  bgcolor: 'gmboard.vtt.surface',
  backgroundImage: 'none',
  border: '1px solid',
  borderColor: 'gmboard.vtt.goldBorder',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
};

// The round icon buttons on the map (Rolls, the tools toggle, fullscreen).
export const mapIconButtonSx = {
  color: VTT_COLORS.gold,
  bgcolor: vttAlpha(VTT_COLORS.ink, 0.8),
  border: `1px solid ${vttAlpha(VTT_COLORS.gold, 0.35)}`,
  '&:hover': { bgcolor: vttAlpha(VTT_COLORS.ink, 0.95) },
};

export const battleMapDialogPaperSx = {
  ...battleMapSurfaceSx,
  borderRadius: 1,
  boxShadow: `0 18px 52px ${vttAlpha(VTT_COLORS.black, 0.62)}`,
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
  borderBottomColor: 'gmboard.vtt.goldBorder',
  color: 'primary.main',
  fontFamily: UI_FONTS.display,
  fontSize: '0.8rem',
  fontWeight: 700,
  letterSpacing: '0.08em',
};

export const battleMapDialogContentSx = {
  bgcolor: 'transparent',
  borderColor: 'gmboard.vtt.goldTint',
};

export const battleMapDialogActionsSx = {
  bgcolor: 'transparent',
  borderTop: '1px solid',
  borderTopColor: 'gmboard.vtt.goldTint',
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
  '& .MuiInputBase-root': { height: 34, fontSize: '0.72rem' },
  '& .MuiInputLabel-root': { fontSize: '0.68rem' },
  '& .MuiInputLabel-shrink': { transform: 'translate(14px, -7px) scale(0.75)' },
};

export const battleMapCheckboxRowSx = {
  m: 0,
  minHeight: 24,
  '& .MuiCheckbox-root': { p: 0.35, mr: 0.25 },
  '& .MuiSvgIcon-root': { fontSize: 17 },
};

export const battleMapControlLabelSx = { fontSize: '0.68rem', lineHeight: 1.2 };

