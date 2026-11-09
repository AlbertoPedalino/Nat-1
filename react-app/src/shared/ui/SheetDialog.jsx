import { Box, Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Stack, Typography } from '@mui/material';
import { X } from 'lucide-react';
import { UI_COLORS, uiAlpha, OPACITY } from './colors.js';
import { FONT_SIZES } from './fonts.js';
import { panelBarSx } from './PanelHeader.jsx';
import { UI_SHADOWS } from './shadows.js';
import { TEXT_STYLES } from './textStyles.js';
import { SURFACES } from './surfaces.js';

// Dialog chrome that matches the character-sheet panels (dark surface, gold
// left-accent header bar, uppercase Cinzel title) so dialogs feel native to
// the sheet rather than like plain MUI popups. Buttons use the sheet's small
// Cinzel scale. Single source for every sheet dialog; pass `headerRight` for
// title-bar extras (counts, a Clear button) and `actions` for the button bar.
// Without a `title` there is no bar, for content that carries its own (a
// statblock, a compendium entry); `showClose` then puts the close button in
// the content's corner.

const paperSx = {
  ...SURFACES.panel,
  backgroundImage: 'none',
  boxShadow: UI_SHADOWS.overlay,
};

const titleSx = {
  ...panelBarSx,
  color: 'primary.main',
  px: 2,
  py: 1,
};

const titleTextSx = {
  ...TEXT_STYLES.label,
  fontSize: FONT_SIZES.md,
  lineHeight: 1.3,
};

// The title of a section inside a dialog's content.
export const dialogSectionTitleSx = {
  ...TEXT_STYLES.label,
  fontSize: FONT_SIZES.md,
  color: 'primary.main',
};

// Base content padding. Top padding uses the `&.MuiDialogContent-root`
// selector to match the specificity of MUI's default
// `.MuiDialogTitle-root + .MuiDialogContent-root { padding-top: 0 }` rule —
// a plain `pt` loses to it and is silently ignored. The gap below the title
// bar is set via the `topPad` prop.
const contentSx = { position: 'relative', bgcolor: uiAlpha(UI_COLORS.surfaceDeep, OPACITY.solid), px: 2.25, pb: 2 };

const cornerCloseSx = { position: 'absolute', top: 8, right: 8, zIndex: 1, color: 'text.secondary' };

const actionsSx = {
  px: 2.25,
  py: 1.25,
  gap: 0.75,
  bgcolor: uiAlpha(UI_COLORS.surfaceDeep, OPACITY.solid),
  borderTop: 1,
  borderColor: 'divider',
  // Small Cinzel buttons matching the sheet's button scale.
  '& .MuiButton-root': {
    ...TEXT_STYLES.label,
    fontSize: FONT_SIZES.xs,
    minWidth: 0,
    px: 1.5,
    py: 0.25,
    borderRadius: 1,
  },
};

export default function SheetDialog({
  open,
  onClose,
  title,
  icon,
  headerRight,
  showClose = false,
  children,
  actions,
  maxWidth = 'xs',
  fullWidth = true,
  topPad = 3,
  titleSx: titleSxOverride,
  contentSx: contentSxOverride,
  actionsSx: actionsSxOverride,
  slotProps,
  ...props
}) {
  const right = showClose
    ? <>{headerRight}<IconButton size="small" onClick={onClose} sx={{ color: 'text.secondary' }}><X size={16} /></IconButton></>
    : headerRight;
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={maxWidth}
      fullWidth={fullWidth}
      slotProps={{
        ...slotProps,
        paper: {
          ...slotProps?.paper,
          sx: { ...paperSx, ...slotProps?.paper?.sx },
        },
      }}
      {...props}
    >
      {title != null ? (
        <DialogTitle sx={{ ...titleSx, ...titleSxOverride }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', width: '100%' }}>
            {icon}
            <Typography component="span" sx={titleTextSx}>{title}</Typography>
            {right != null ? <><Box component="span" sx={{ flex: 1 }} />{right}</> : null}
          </Stack>
        </DialogTitle>
      ) : null}
      <DialogContent sx={{ ...contentSx, '&.MuiDialogContent-root': { pt: topPad }, ...contentSxOverride }}>
        {title == null && showClose ? (
          <IconButton size="small" aria-label="Close" onClick={onClose} sx={cornerCloseSx}><X size={16} /></IconButton>
        ) : null}
        {children}
      </DialogContent>
      {actions != null ? <DialogActions sx={{ ...actionsSx, ...actionsSxOverride }}>{actions}</DialogActions> : null}
    </Dialog>
  );
}
