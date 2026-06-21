const FONT_TITLE = '"Cinzel", Georgia, serif';

export const panelRootSx = {
  display: 'grid',
  gap: 1,
  minWidth: 0,
};

export const panelSurfaceSx = {
  bgcolor: 'rgba(35,32,26,1)',
  border: 1,
  borderColor: 'divider',
  borderRadius: 1,
  p: 1,
  minWidth: 0,
};

export const panelToolbarSx = {
  ...panelSurfaceSx,
  display: 'flex',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: 0.65,
};

export const levelHeaderSx = {
  fontFamily: FONT_TITLE,
  fontSize: '0.65rem',
  fontWeight: 700,
  letterSpacing: '0.12em',
  color: '#4d95d6',
  textTransform: 'uppercase',
  borderBottom: 1,
  borderColor: 'rgba(77,149,214,0.14)',
  pb: '4px',
  mb: 0.55,
};

export const spellRowSx = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  px: '10px',
  py: '7px',
  bgcolor: 'rgba(35,32,26,1)',
  border: 1,
  borderColor: 'divider',
  borderRadius: 1,
  mb: '4px',
  color: 'text.primary',
  cursor: 'pointer',
  minWidth: 0,
  transition: 'border-color 120ms ease, background-color 120ms ease',
  '&:hover': { borderColor: 'rgba(202,165,80,0.34)', bgcolor: 'rgba(42,38,31,1)' },
};

export const spellBodySx = {
  fontSize: '0.72rem',
  color: 'text.secondary',
  lineHeight: 1.5,
  bgcolor: '#12100e',
  border: 1,
  borderColor: 'divider',
  borderTop: 'none',
  borderRadius: '0 0 8px 8px',
  px: '10px',
  py: '7px',
  mt: '-4px',
  mb: '4px',
};

export const addButtonSx = {
  bgcolor: 'rgba(202,165,80,0.12)',
  border: 1,
  borderColor: '#caa550',
  borderRadius: 1,
  color: '#caa550',
  fontFamily: FONT_TITLE,
  fontSize: '0.7rem',
  fontWeight: 700,
  letterSpacing: '0.06em',
  px: '14px',
  py: '5px',
  '&:hover': { bgcolor: 'rgba(202,165,80,0.2)', borderColor: '#edd48a' },
};

export const inlineButtonSx = {
  fontSize: '0.6rem',
  minWidth: 0,
  py: 0.2,
  px: 0.8,
  lineHeight: 1.3,
  borderRadius: 1,
  fontFamily: FONT_TITLE,
  letterSpacing: '0.04em',
};

export const compactInputSx = {
  '& .MuiOutlinedInput-root': { bgcolor: 'rgba(35,32,26,1)', borderRadius: 1 },
  '& input': { fontSize: '0.75rem', py: '7px' },
};

export const levelToggleSx = {
  flexWrap: 'wrap',
  '& .MuiToggleButton-root': {
    minHeight: 0,
    px: '9px',
    py: '4px',
    fontFamily: FONT_TITLE,
    fontSize: '0.58rem',
    letterSpacing: '0.08em',
    color: 'text.secondary',
    borderColor: 'divider',
    '&.Mui-selected': { color: '#edd48a', bgcolor: 'rgba(202,165,80,0.12)', borderColor: '#caa550' },
  },
};

export const filterChipSx = {
  height: 22,
  fontFamily: FONT_TITLE,
  fontSize: '0.56rem',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.09em',
  borderRadius: 1,
};

export const statBoxSx = {
  minWidth: 92,
  bgcolor: 'rgba(20,18,15,0.72)',
  border: 1,
  borderColor: 'divider',
  borderRadius: 1,
  px: 1,
  py: 0.65,
  textAlign: 'center',
};
