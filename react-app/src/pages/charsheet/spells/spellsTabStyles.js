import { UI_COLORS, uiAlpha } from '../../../shared/ui/colors.js';
import { UI_FONTS } from '../../../shared/ui/fonts.js';
import { sheetSectionHeaderSx } from '../../../shared/ui/PanelHeader.jsx';
export const panelRootSx = {
  display: 'grid',
  gap: 1,
  minWidth: 0,
};

export const panelSurfaceSx = {
  bgcolor: UI_COLORS.headerBg,
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
  ...sheetSectionHeaderSx({ color: UI_COLORS.blue, rule: uiAlpha(UI_COLORS.blue, 0.14) }),
  mb: 0.55,
};

export const spellRowSx = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  px: '10px',
  py: '7px',
  bgcolor: UI_COLORS.headerBg,
  border: 1,
  borderColor: 'divider',
  borderRadius: 1,
  mb: '4px',
  color: 'text.primary',
  cursor: 'pointer',
  minWidth: 0,
  transition: 'border-color 120ms ease, background-color 120ms ease',
  '&:hover': { borderColor: uiAlpha(UI_COLORS.gold, 0.34), bgcolor: UI_COLORS.surfaceHover },
};

export const spellBodySx = {
  fontSize: '0.72rem',
  color: 'text.secondary',
  lineHeight: 1.5,
  bgcolor: UI_COLORS.ink,
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
  bgcolor: uiAlpha(UI_COLORS.gold, 0.12),
  border: 1,
  borderColor: UI_COLORS.gold,
  borderRadius: 1,
  color: UI_COLORS.gold,
  fontFamily: UI_FONTS.display,
  fontSize: '0.7rem',
  fontWeight: 700,
  letterSpacing: '0.06em',
  px: '14px',
  py: '5px',
  '&:hover': { bgcolor: uiAlpha(UI_COLORS.gold, 0.2), borderColor: UI_COLORS.goldLight },
};

export const inlineButtonSx = {
  fontSize: '0.6rem',
  minWidth: 0,
  py: 0.2,
  px: 0.8,
  lineHeight: 1.3,
  borderRadius: 1,
  fontFamily: UI_FONTS.display,
  letterSpacing: '0.04em',
};

export const compactInputSx = {
  '& .MuiOutlinedInput-root': { bgcolor: UI_COLORS.headerBg, borderRadius: 1 },
  '& input': { fontSize: '0.75rem', py: '7px' },
};

export const levelToggleSx = {
  flexWrap: 'wrap',
  '& .MuiToggleButton-root': {
    minHeight: 0,
    px: '9px',
    py: '4px',
    fontFamily: UI_FONTS.display,
    fontSize: '0.58rem',
    letterSpacing: '0.08em',
    color: 'text.secondary',
    borderColor: 'divider',
    '&.Mui-selected': { color: UI_COLORS.goldLight, bgcolor: uiAlpha(UI_COLORS.gold, 0.12), borderColor: UI_COLORS.gold },
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
