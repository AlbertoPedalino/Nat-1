import { UI_COLORS, uiAlpha } from '../../../shared/ui/colors.js';
import { cornerRadius } from '../../../shared/ui/radius.js';
import { UI_FONTS, FONT_SIZES, LETTER_SPACINGS } from '../../../shared/ui/fonts.js';
import { sheetSectionHeaderSx } from '../../../shared/ui/PanelHeader.jsx';
export const panelRootSx = {
  display: 'grid',
  gap: 1,
  minWidth: 0,
};

export const panelSurfaceSx = {
  bgcolor: UI_COLORS.surfaceHeader,
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
  ...sheetSectionHeaderSx({ color: UI_COLORS.info, rule: uiAlpha(UI_COLORS.info, 0.14) }),
  mb: 0.55,
};

export const spellRowSx = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  px: '10px',
  py: '7px',
  bgcolor: UI_COLORS.surfaceHeader,
  border: 1,
  borderColor: 'divider',
  borderRadius: 1,
  mb: '4px',
  color: 'text.primary',
  cursor: 'pointer',
  minWidth: 0,
  transition: 'border-color 120ms ease, background-color 120ms ease',
  '&:hover': { borderColor: uiAlpha(UI_COLORS.accent, 0.34), bgcolor: UI_COLORS.surfaceRaised },
};

export const spellBodySx = {
  fontSize: FONT_SIZES.md,
  color: 'text.secondary',
  lineHeight: 1.5,
  bgcolor: UI_COLORS.surfaceSunken,
  border: 1,
  borderColor: 'divider',
  borderTop: 'none',
  borderRadius: cornerRadius(0, 0, 1, 1),
  px: '10px',
  py: '7px',
  mt: '-4px',
  mb: '4px',
};

export const addButtonSx = {
  bgcolor: uiAlpha(UI_COLORS.accent, 0.12),
  border: 1,
  borderColor: UI_COLORS.accent,
  borderRadius: 1,
  color: UI_COLORS.accent,
  fontFamily: UI_FONTS.display,
  fontSize: FONT_SIZES.md,
  fontWeight: 700,
  letterSpacing: LETTER_SPACINGS.md,
  px: '14px',
  py: '5px',
  '&:hover': { bgcolor: uiAlpha(UI_COLORS.accent, 0.2), borderColor: UI_COLORS.accentText },
};

export const inlineButtonSx = {
  fontSize: FONT_SIZES.xs,
  minWidth: 0,
  py: 0.2,
  px: 0.8,
  lineHeight: 1.3,
  borderRadius: 1,
  fontFamily: UI_FONTS.display,
  letterSpacing: LETTER_SPACINGS.sm,
};

export const compactInputSx = {
  '& .MuiOutlinedInput-root': { bgcolor: UI_COLORS.surfaceHeader, borderRadius: 1 },
  '& input': { fontSize: FONT_SIZES.lg, py: '7px' },
};

export const levelToggleSx = {
  flexWrap: 'wrap',
  '& .MuiToggleButton-root': {
    minHeight: 0,
    px: '9px',
    py: '4px',
    fontFamily: UI_FONTS.display,
    fontSize: FONT_SIZES.xxs,
    letterSpacing: LETTER_SPACINGS.lg,
    color: 'text.secondary',
    borderColor: 'divider',
    '&.Mui-selected': { color: UI_COLORS.accentText, bgcolor: uiAlpha(UI_COLORS.accent, 0.12), borderColor: UI_COLORS.accent },
  },
};

export const statBoxSx = {
  minWidth: 92,
  bgcolor: uiAlpha(UI_COLORS.surfaceSunken, 0.72),
  border: 1,
  borderColor: 'divider',
  borderRadius: 1,
  px: 1,
  py: 0.65,
  textAlign: 'center',
};
