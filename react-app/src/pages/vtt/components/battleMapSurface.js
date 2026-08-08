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

export const battleMapDialogPaperSx = {
  ...battleMapSurfaceSx,
  borderRadius: 1,
  boxShadow: (theme) => `0 18px 52px ${theme.palette.gmboard.vtt.backdrop}`,
};

export const battleMapDialogTitleSx = {
  bgcolor: 'transparent',
  borderBottom: '1px solid',
  borderBottomColor: 'gmboard.vtt.goldBorder',
  color: 'primary.main',
  fontFamily: '"Cinzel", Georgia, serif',
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
import { VTT_COLORS, vttAlpha } from '../../../shared/vtt/colors.js';
