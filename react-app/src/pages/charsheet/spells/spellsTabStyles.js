import { UI_COLORS, uiAlpha, OPACITY } from '../../../shared/ui/colors.js';
import { sheetSectionHeaderSx } from '../../../shared/ui/PanelHeader.jsx';
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
  gap: 0.75,
};

export const levelHeaderSx = {
  ...sheetSectionHeaderSx({ color: UI_COLORS.info, rule: uiAlpha(UI_COLORS.info, OPACITY.fill) }),
  mb: 0.5,
};

// The tab's own action (Add / Remove Spell): the theme's filled button,
// raised like every button, in the tab's lettering.

