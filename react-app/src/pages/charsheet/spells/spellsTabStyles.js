import { UI_COLORS, uiAlpha, OPACITY } from '../../../shared/ui/colors.js';
import { cornerRadius } from '../../../shared/ui/radius.js';
import { FONT_SIZES } from '../../../shared/ui/fonts.js';
import { sheetSectionHeaderSx } from '../../../shared/ui/PanelHeader.jsx';
import { TEXT_STYLES } from '../../../shared/ui/textStyles.js';
import { SURFACES } from '../../../shared/ui/surfaces.js';
export const panelRootSx = {
  display: 'grid',
  gap: 1,
  minWidth: 0,
};

export const panelSurfaceSx = {
  ...SURFACES.panel,
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
  ...sheetSectionHeaderSx({ color: UI_COLORS.info, rule: uiAlpha(UI_COLORS.info, OPACITY.fill) }),
  mb: 0.55,
};

export const spellRowSx = {
  ...SURFACES.panel,
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  px: '10px',
  py: '7px',
  mb: '4px',
  color: 'text.primary',
  cursor: 'pointer',
  minWidth: 0,
  transition: 'border-color 120ms ease, background-color 120ms ease',
  '&:hover': { borderColor: uiAlpha(UI_COLORS.accent, OPACITY.line), bgcolor: UI_COLORS.surfaceRaised },
};

export const spellBodySx = {
  ...SURFACES.inset,
  fontSize: FONT_SIZES.md,
  color: 'text.secondary',
  lineHeight: 1.5,
  borderTop: 'none',
  borderRadius: cornerRadius(0, 0, 1, 1),
  px: '10px',
  py: '7px',
  mt: '-4px',
  mb: '4px',
};

export const addButtonSx = {
  bgcolor: uiAlpha(UI_COLORS.accent, OPACITY.tint),
  border: 1,
  borderColor: UI_COLORS.accent,
  borderRadius: 1,
  color: UI_COLORS.accent,
  ...TEXT_STYLES.title,
  fontSize: FONT_SIZES.md,
  px: '14px',
  py: '5px',
  '&:hover': { bgcolor: uiAlpha(UI_COLORS.accent, OPACITY.shade), borderColor: UI_COLORS.accentText },
};

export const inlineButtonSx = {
  fontSize: FONT_SIZES.xs,
  minWidth: 0,
  py: 0.2,
  px: 0.8,
  lineHeight: 1.3,
  borderRadius: 1,
  ...TEXT_STYLES.title,
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
    ...TEXT_STYLES.title,
    fontSize: FONT_SIZES.xxs,
    color: 'text.secondary',
    borderColor: 'divider',
  },
};

export const statBoxSx = {
  ...SURFACES.inset,
  minWidth: 92,
  px: 1,
  py: 0.65,
  textAlign: 'center',
};
