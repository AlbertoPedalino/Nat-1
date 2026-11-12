import { UI_COLORS } from '../../shared/ui/colors.js';
import { FONT_SIZES } from '../../shared/ui/fonts.js';
import { TEXT_STYLES } from '../../shared/ui/textStyles.js';

// The instance picker's own pieces; the page frame is AppPage, its header
// PageHeader and its rows EntityRow (through InstanceRow).

export const newBtnSx = {
  ...TEXT_STYLES.title,
  fontSize: FONT_SIZES.sm,
};

export const sectionHeadSx = {
  ...TEXT_STYLES.label,
  fontSize: FONT_SIZES.xxl,
  color: UI_COLORS.textSecondary,
  mb: '0.75rem',
};

export const listSx = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
};

// An empty list: the shared state panel (it has its own paper, so it reads
// over the page's drawings), sized to the list.
export const emptyStateSx = {
  minHeight: 0,
};

// The picker's error, above its list.
export const errorLineSx = { mb: '0.75rem' };
