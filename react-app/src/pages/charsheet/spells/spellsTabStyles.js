import { UI_COLORS, uiAlpha, OPACITY } from '../../../shared/ui/colors.js';
import { FONT_SIZES, LINE_HEIGHTS } from '../../../shared/ui/fonts.js';
import { sheetSectionHeaderSx } from '../../../shared/ui/PanelHeader.jsx';
import { TEXT_STYLES } from '../../../shared/ui/textStyles.js';
import { SURFACES } from '../../../shared/ui/surfaces.js';
import { CARD_PART_RULE_SX, CARD_SX } from '../../../shared/ui/interactive.js';
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
  gap: 0.75,
};

export const levelHeaderSx = {
  ...sheetSectionHeaderSx({ color: UI_COLORS.info, rule: uiAlpha(UI_COLORS.info, OPACITY.fill) }),
  mb: 0.5,
};

// An action's or a spell's card (the container: its edge, lift and hover)
// and the title row inside it.
export const spellCardSx = { ...CARD_SX, overflow: 'hidden' };

export const spellRowSx = {
  display: 'flex',
  alignItems: 'center',
  gap: 1,
  px: 1.25,
  py: 1,
  color: 'text.primary',
  cursor: 'pointer',
  minWidth: 0,
};

// The opened description at the foot of a card.
export const spellBodySx = {
  ...CARD_PART_RULE_SX,
  bgcolor: UI_COLORS.surfaceSunken,
  fontSize: FONT_SIZES.md,
  color: 'text.secondary',
  lineHeight: LINE_HEIGHTS.normal,
  px: 1.25,
  py: 1,
};

export const addButtonSx = {
  bgcolor: uiAlpha(UI_COLORS.accent, OPACITY.tint),
  border: 2,
  borderColor: UI_COLORS.accent,
  borderRadius: 1,
  color: UI_COLORS.accent,
  ...TEXT_STYLES.title,
  fontSize: FONT_SIZES.md,
  px: 1.75,
  py: 0.75,
  '&:hover': { bgcolor: uiAlpha(UI_COLORS.accent, OPACITY.shade), borderColor: UI_COLORS.accentText },
};

export const inlineButtonSx = {
  fontSize: FONT_SIZES.xs,
  minWidth: 0,
  py: 0.25,
  px: 0.75,
  lineHeight: LINE_HEIGHTS.snug,
  borderRadius: 1,
  ...TEXT_STYLES.title,
};

export const compactInputSx = {
  '& input': { fontSize: FONT_SIZES.lg, py: 1 },
};

export const levelToggleSx = {
  flexWrap: 'wrap',
  '& .MuiToggleButton-root': {
    minHeight: 0,
    px: 1.25,
    py: 0.5,
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
  py: 0.75,
  textAlign: 'center',
};
