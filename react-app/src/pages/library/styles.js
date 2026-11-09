import { alpha } from '@mui/material/styles';
import { APP_TOP_BAR_HEIGHT } from '../../app/navigation/AppTopBar.jsx';
import { UI_COLORS, uiAlpha, OPACITY } from '../../shared/ui/colors.js';
import { UI_FONTS, FONT_SIZES } from '../../shared/ui/fonts.js';
import { TEXT_STYLES } from '../../shared/ui/textStyles.js';

// Row/panel visuals carried over from the old Home "Continue" section, now
// serving the full-page instance picker instead of a compact home panel.

export const rootSx = {
  minHeight: '100vh',
  bgcolor: UI_COLORS.surfaceDarkest,
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
  ...TEXT_STYLES.title,
  fontSize: 'clamp(1.3rem, 4vw, 1.7rem)',
  color: UI_COLORS.accentText,
  flex: 1,
  minWidth: '160px',
};

export const newBtnSx = {
  ...TEXT_STYLES.title,
  fontSize: FONT_SIZES.sm,
  
};

export const sectionHeadSx = {
  width: '100%',
  maxWidth: '640px',
  ...TEXT_STYLES.label,
  fontSize: FONT_SIZES.xxl,
  color: UI_COLORS.textSecondary,
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
  border: `1px solid ${uiAlpha(UI_COLORS.accentMuted, OPACITY.fill)}`,
  borderRadius: 1.25,
  bgcolor: UI_COLORS.surfaceDeep,
  '&:hover': { borderColor: UI_COLORS.accent },
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
  fontSize: FONT_SIZES.xxl,
};

export const subtitleSx = {
  color: UI_COLORS.textFaint,
  fontSize: FONT_SIZES.md,
};

export const metaSx = {
  color: UI_COLORS.textFaint,
  fontSize: FONT_SIZES.lg,
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
  border: `1px solid ${uiAlpha(UI_COLORS.accentMuted, OPACITY.fill)}`,
  borderRadius: 0.75,
  background: uiAlpha(UI_COLORS.black, OPACITY.fill),
  color: UI_COLORS.textFaint,
  cursor: 'pointer',
  p: 0,
  '&:hover': { borderColor: UI_COLORS.accent, color: UI_COLORS.accentText },
};

export const deleteBtnSx = {
  ...iconBtnSx,
  '&:hover': { borderColor: UI_COLORS.dangerStrong, color: UI_COLORS.dangerStrong },
};

export function badgeSx(kind, theme) {
  const color = kind === 'cloud' ? theme.palette.gmboard.badge.cloud : UI_COLORS.textSecondary;
  return {
    height: '18px',
    fontSize: FONT_SIZES.xs,
    ...TEXT_STYLES.title,
    borderRadius: 0.5,
    color,
    bgcolor: alpha(color, OPACITY.tint),
    border: '1px solid',
    borderColor: alpha(color, OPACITY.line),
  };
}

export const emptyBoxSx = {
  width: '100%',
  maxWidth: '640px',
  textAlign: 'center',
  p: '2rem 1rem',
  border: `1px dashed ${uiAlpha(UI_COLORS.accentMuted, OPACITY.shade)}`,
  borderRadius: 1.5,
};

export const emptyTextSx = {
  color: UI_COLORS.textMuted,
  fontSize: FONT_SIZES.xxl,
  fontStyle: 'italic',
  fontFamily: UI_FONTS.prose,
};

export const errorTextSx = {
  width: '100%',
  maxWidth: '640px',
  color: UI_COLORS.danger,
  fontSize: FONT_SIZES.xl,
  mb: '0.75rem',
};
