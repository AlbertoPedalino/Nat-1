import { alpha } from '@mui/material/styles';
import { APP_TOP_BAR_HEIGHT } from '../../components/AppTopBar.jsx';

// Row/panel visuals carried over from the old Home "Continue" section, now
// serving the full-page instance picker instead of a compact home panel.

export const rootSx = {
  minHeight: '100vh',
  bgcolor: '#0f0e0d',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  p: '2rem 1rem',
  pt: `calc(2rem + ${APP_TOP_BAR_HEIGHT})`,
};

export const headerSx = {
  width: '100%',
  maxWidth: '640px',
  display: 'flex',
  alignItems: 'center',
  gap: '0.85rem',
  mb: '1.5rem',
  flexWrap: 'wrap',
};

export const titleSx = {
  fontFamily: '"Cinzel", Georgia, serif',
  fontSize: 'clamp(1.3rem, 4vw, 1.7rem)',
  fontWeight: 800,
  letterSpacing: '0.06em',
  color: '#e8c96a',
  flex: 1,
  minWidth: '160px',
};

export const newBtnSx = {
  fontFamily: '"Cinzel", Georgia, serif',
  fontSize: '0.68rem',
  letterSpacing: '0.06em',
};

export const sectionHeadSx = {
  width: '100%',
  maxWidth: '640px',
  fontFamily: '"Cinzel", Georgia, serif',
  fontSize: '0.86rem',
  fontWeight: 700,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: '#b8a87a',
  mb: '0.75rem',
};

export const listSx = {
  width: '100%',
  maxWidth: '640px',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
};

export const rowSx = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  p: '0.6rem 0.75rem',
  border: '1px solid rgba(180,150,90,0.18)',
  borderRadius: '10px',
  bgcolor: '#1a1815',
  '&:hover': { borderColor: '#c8a84b' },
};

export const rowInnerSx = {
  flex: 1,
  minWidth: 0,
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
  textDecoration: 'none',
  color: 'inherit',
  cursor: 'pointer',
  background: 'none',
  border: 0,
  textAlign: 'left',
  font: 'inherit',
  p: 0,
};

export const nameSx = {
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  fontSize: '0.92rem',
};

export const subtitleSx = {
  color: '#7a6a4a',
  fontSize: '0.7rem',
};

export const metaSx = {
  color: '#7a6a4a',
  fontSize: '0.76rem',
  whiteSpace: 'nowrap',
  flexShrink: 0,
};

export const actionsSx = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.3rem',
  flexShrink: 0,
};

export const iconBtnSx = {
  width: '28px',
  height: '28px',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: '1px solid rgba(180,150,90,0.18)',
  borderRadius: '6px',
  background: 'rgba(0,0,0,0.18)',
  color: '#7a6a4a',
  cursor: 'pointer',
  p: 0,
  '&:hover': { borderColor: '#c8a84b', color: '#e8c96a' },
};

export const deleteBtnSx = {
  ...iconBtnSx,
  '&:hover': { borderColor: '#e74c3c', color: '#e74c3c' },
};

export function badgeSx(kind, theme) {
  const color = kind === 'cloud' ? theme.palette.gmboard.badge.cloud : '#b8a87a';
  return {
    height: '18px',
    fontSize: '0.62rem',
    fontFamily: '"Cinzel", Georgia, serif',
    letterSpacing: '0.04em',
    borderRadius: '4px',
    color,
    bgcolor: alpha(color, 0.12),
    border: '1px solid',
    borderColor: alpha(color, 0.35),
  };
}

export const emptyBoxSx = {
  width: '100%',
  maxWidth: '640px',
  textAlign: 'center',
  p: '2rem 1rem',
  border: '1px dashed rgba(180,150,90,0.25)',
  borderRadius: '12px',
};

export const emptyTextSx = {
  color: '#9a8a6a',
  fontSize: '0.9rem',
  fontStyle: 'italic',
  fontFamily: '"EB Garamond", Georgia, serif',
};

export const errorTextSx = {
  width: '100%',
  maxWidth: '640px',
  color: '#de675f',
  fontSize: '0.82rem',
  mb: '0.75rem',
};
