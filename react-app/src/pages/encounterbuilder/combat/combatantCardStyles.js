import { alpha } from '@mui/material/styles';
import { cornerRadius } from '../../../shared/ui/radius.js';
import { UI_COLORS, uiAlpha, OPACITY } from '../../../shared/ui/colors.js';
import { FONT_SIZES, LETTER_SPACINGS, FONT_WEIGHTS, LINE_HEIGHTS } from '../../../shared/ui/fonts.js';
import { TEXT_STYLES } from '../../../shared/ui/textStyles.js';
import { SURFACES } from '../../../shared/ui/surfaces.js';
import { CONTROL_HEIGHTS } from '../../../shared/ui/controlHeights.js';
import { DURATIONS } from '../../../shared/ui/motion.js';
import { inkShadow } from '../../../shared/ui/shadows.js';

export const nameSpanSx = { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };

export const rowSx = {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  columnGap: { xs: 1.5, sm: 3 },
  rowGap: 1.25,
  pr: 3,
};

export const removeButtonSx = {
  position: 'absolute',
  top: 4,
  right: 4,
  zIndex: 1,
  color: 'text.secondary',
  '&:hover': { color: 'error.main' },
};

export const identityClusterSx = {
  display: 'flex',
  alignItems: 'center',
  gap: 1,
  flex: '1 1 240px',
  minWidth: 0,
};

export const avatarBaseSx = { width: 34, height: 34, color: UI_COLORS.surfaceSunken, fontSize: FONT_SIZES.sm, fontWeight: FONT_WEIGHTS.heavy };

export const nameButtonSx = { justifyContent: 'flex-start', minWidth: 0, px: 0.5 };

export const sheetLinkButtonSx = {
  width: 24,
  height: 24,
  flex: '0 0 auto',
  color: 'text.secondary',
};

// AC is the number a GM reads on every attack roll, so it gets a bordered
// badge instead of a caption: prominence comes from size and framing, not from
// a new accent color that would fight the gold active-turn highlight.
export const acBadgeSx = {
  ...SURFACES.wash,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 0.5,
  mt: 0.25,
  px: 0.75,
  py: 0.25,
  color: 'text.secondary',
  lineHeight: LINE_HEIGHTS.none,
};

export const acLabelSx = { fontSize: FONT_SIZES.xxs, fontWeight: FONT_WEIGHTS.bold, letterSpacing: LETTER_SPACINGS.xl };

export const acValueSx = { fontSize: FONT_SIZES.body, fontWeight: FONT_WEIGHTS.heavy, color: 'text.primary' };

export const conditionsRowSx = {
  flex: '1 1 100%',
  minWidth: 0,
  pt: 0.5,
  borderTop: 1,
  borderColor: 'divider',
};

// No divider of its own: conditions and reminders read as one block of markers,
// and a second rule inside it would split the card three ways.
export const effectsRowSx = {
  flex: '1 1 100%',
  minWidth: 0,
};

export const hpSummaryRowSx = {
  display: 'flex',
  alignItems: 'center',
  gap: 0.5,
  flexWrap: 'wrap',
  minHeight: CONTROL_HEIGHTS.sm,
};

// Labelled disclosure: the row must say what it hides, otherwise a bare chevron
// on a combatant with no temp HP and no max-HP modifier means nothing.
export const hpToggleSx = {
  flex: '0 0 auto',
  minWidth: 0,
  px: 0.5,
  py: 0,
  color: 'text.secondary',
  fontSize: FONT_SIZES.xs,
  ...TEXT_STYLES.label,
  '& .MuiButton-startIcon': { mr: 0.5 },
  '&:hover': { color: 'text.primary' },
};

export const hpFlagSx = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 0.25,
  px: 0.5,
  py: 0.25,
  border: 2,
  borderColor: UI_COLORS.edge,
  borderRadius: 1,
  color: 'primary.main',
  fontSize: FONT_SIZES.md,
  lineHeight: LINE_HEIGHTS.none,
  flex: '0 0 auto',
};

export const hpDetailsSx = { display: 'flex', flexDirection: 'column', gap: 0.75 };

// A fully collapsed Collapse still renders a zero-height box, which keeps
// earning a slot in the parent's flex gap. MUI tags that state with
// .MuiCollapse-hidden once the exit transition ends, so dropping the box out of
// layout there removes the phantom gap without costing the animation.
export const collapseSx = { '&.MuiCollapse-hidden': { display: 'none' } };

export const hpPanelRowSx = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 1,
  flexWrap: 'wrap',
  rowGap: 0.5,
};

export const hpValueRowSx = { display: 'flex', alignItems: 'center', gap: 0.5 };

export const hpFieldSx = { width: 72, flex: '0 0 auto' };

export const hpMaxSx = { whiteSpace: 'nowrap', fontSize: FONT_SIZES.xl };

export const hpBarSx = {
  width: '100%',
  height: 5,
  borderRadius: 1,
  bgcolor: uiAlpha(UI_COLORS.white, OPACITY.soft),
};

// A combatant: the drawn card (SURFACES.card); the one whose turn it is is
// edged in the accent and casts its solid shadow in it, as a toast does.
export const cardSx = {
  ...SURFACES.card,
  position: 'relative',
  p: 1,
  transition: `border-color ${DURATIONS.fast}ms ease, box-shadow ${DURATIONS.fast}ms ease, background-color ${DURATIONS.fast}ms ease`,
};

export const hpRowSx = {
  display: 'flex',
  flexDirection: 'column',
  gap: 0.75,
  flex: '1 1 300px',
  minWidth: 0,
  '& .MuiInputBase-input': {
    py: 0.5,
    fontSize: FONT_SIZES.xxl,
  },
  '& .MuiInputLabel-root': {
    fontSize: FONT_SIZES.lg,
  },
};

// Active-turn highlight, derived from the theme's primary color so it tracks
// any palette change (no hardcoded gold). Transparent base border in cardSx
// keeps the toggle from shifting layout; ::before draws the left accent bar.
export function buildActiveSx(theme) {
  const accent = theme.palette.primary.main;
  return {
    borderColor: accent,
    bgcolor: alpha(accent, OPACITY.tint),
    boxShadow: inkShadow(accent),
    '&::before': {
      content: '""',
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: 5,
      bgcolor: accent,
      borderRadius: cornerRadius(0.75, 0, 0, 0.75),
    },
  };
}

export const deadSx = {
  opacity: OPACITY.strong,
};
