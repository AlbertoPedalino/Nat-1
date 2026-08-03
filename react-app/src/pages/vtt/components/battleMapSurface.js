// Shared glass surface for every control floating over the battle map. Keeping
// the rail and its dialogs on the same tokens prevents ordinary MUI paper from
// appearing as a solid block beside the translucent toolbar.
export const battleMapSurfaceSx = {
  bgcolor: 'rgba(15,14,13,0.9)',
  backgroundImage: 'none',
  border: '1px solid rgba(232,201,106,0.25)',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
};

export const battleMapDialogPaperSx = {
  ...battleMapSurfaceSx,
  borderRadius: 1,
  boxShadow: '0 18px 52px rgba(0,0,0,0.62)',
};

export const battleMapDialogTitleSx = {
  bgcolor: 'transparent',
  borderBottom: '1px solid rgba(232,201,106,0.25)',
  color: 'primary.main',
  fontFamily: '"Cinzel", Georgia, serif',
  fontSize: '0.8rem',
  fontWeight: 700,
  letterSpacing: '0.08em',
};

export const battleMapDialogContentSx = {
  bgcolor: 'transparent',
  borderColor: 'rgba(232,201,106,0.18)',
};

export const battleMapDialogActionsSx = {
  bgcolor: 'transparent',
  borderTop: '1px solid rgba(232,201,106,0.18)',
};

// Placement dialogs stay open while a piece is dragged, but only their paper
// should intercept the pointer. Outside it, the map remains a real drop target.
export const battleMapDropDialogSx = {
  pointerEvents: 'none',
  '& .MuiDialog-paper': { pointerEvents: 'auto' },
};

export const battleMapDropBackdropSx = {
  pointerEvents: 'none',
  bgcolor: 'rgba(0,0,0,0.16)',
};
