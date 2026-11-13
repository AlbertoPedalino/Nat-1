import { UI_COLORS, uiAlpha, OPACITY } from '../../../shared/ui/colors.js';
import { CONTROL_FONT_SIZES, FONT_SIZES, LINE_HEIGHTS } from '../../../shared/ui/fonts.js';
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

// The tab's own action (Add / Remove Spell): the theme's filled button,
// raised like every button, in the tab's lettering.
export const addButtonSx = {
  ...TEXT_STYLES.title,
  fontSize: FONT_SIZES.md,
  px: 1.75,
  py: 0.75,
};

export const inlineButtonSx = {
  // A roller in a card's row: the controls' small label.
  fontSize: CONTROL_FONT_SIZES.small,
  minWidth: 0,
  py: 0.25,
  px: 0.75,
  lineHeight: LINE_HEIGHTS.snug,
  borderRadius: 1,
};

