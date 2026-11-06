import { alpha } from '@mui/material/styles';
import { APP_TOP_BAR_HEIGHT } from '../../app/navigation/AppTopBar.jsx';
import { UI_COLORS, uiAlpha } from '../../shared/ui/colors.js';
import { UI_FONTS } from '../../shared/ui/fonts.js';

// Row/panel visuals carried over from the old Home "Continue" section, now
// serving the full-page instance picker instead of a compact home panel.

export const rootSx = {
  minHeight: '100vh',
  bgcolor: UI_COLORS.inkDeep,
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
  fontFamily: UI_FONTS.display,
  fontSize: 'clamp(1.3rem, 4vw, 1.7rem)',
  fontWeight: 800,
  letterSpacing: '0.06em',
  color: UI_COLORS.goldBright,
  flex: 1,
  minWidth: '160px',
};

export const newBtnSx = {
  fontFamily: UI_FONTS.display,
  fontSize: '0.68rem',
  letterSpacing: '0.06em',
};

export const sectionHeadSx = {
  width: '100%',
  maxWidth: '640px',
  fontFamily: UI_FONTS.display,
  fontSize: '0.86rem',
  fontWeight: 700,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: UI_COLORS.textRail,
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
  border: `1px solid ${uiAlpha(UI_COLORS.goldDim, 0.18)}`,
  borderRadius: '10px',
  bgcolor: UI_COLORS.surfaceHome,
  '&:hover': { borderColor: UI_COLORS.goldDeep },
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
  color: UI_COLORS.textBrown,
  fontSize: '0.7rem',
};

export const metaSx = {
  color: UI_COLORS.textBrown,
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
  border: `1px solid ${uiAlpha(UI_COLORS.goldDim, 0.18)}`,
  borderRadius: '6px',
  background: uiAlpha(UI_COLORS.black, 0.18),
  color: UI_COLORS.textBrown,
  cursor: 'pointer',
  p: 0,
  '&:hover': { borderColor: UI_COLORS.goldDeep, color: UI_COLORS.goldBright },
};

export const deleteBtnSx = {
  ...iconBtnSx,
  '&:hover': { borderColor: UI_COLORS.dangerFlat, color: UI_COLORS.dangerFlat },
};

export function badgeSx(kind, theme) {
  const color = kind === 'cloud' ? theme.palette.gmboard.badge.cloud : UI_COLORS.textRail;
  return {
    height: '18px',
    fontSize: '0.62rem',
    fontFamily: UI_FONTS.display,
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
  border: `1px dashed ${uiAlpha(UI_COLORS.goldDim, 0.25)}`,
  borderRadius: '12px',
};

export const emptyTextSx = {
  color: UI_COLORS.textDim,
  fontSize: '0.9rem',
  fontStyle: 'italic',
  fontFamily: UI_FONTS.prose,
};

export const errorTextSx = {
  width: '100%',
  maxWidth: '640px',
  color: UI_COLORS.danger,
  fontSize: '0.82rem',
  mb: '0.75rem',
};
