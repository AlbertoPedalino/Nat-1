import { Box, Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Stack, Typography } from '@mui/material';
import { X } from 'lucide-react';
import { UI_COLORS, uiAlpha } from './colors.js';
import { UI_FONTS } from './fonts.js';
import { panelBarSx } from './PanelHeader.jsx';

// Dialog chrome that matches the character-sheet panels (dark surface, gold
// left-accent header bar, uppercase Cinzel title) so dialogs feel native to
// the sheet rather than like plain MUI popups. Buttons use the sheet's small
// Cinzel scale. Single source for every sheet dialog; pass `headerRight` for
// title-bar extras (counts, a Clear button) and `actions` for the button bar.
// Without a `title` there is no bar, for content that carries its own (a
// statblock, a compendium entry); `showClose` then puts the close button in
// the content's corner.

const paperSx = {
  bgcolor: uiAlpha(UI_COLORS.surfaceDeep, 0.98),
  border: 1,
  borderColor: 'divider',
  borderRadius: 2,
  backgroundImage: 'none',
  boxShadow: `0 18px 52px ${uiAlpha(UI_COLORS.black, 0.62)}`,
};

const titleSx = {
  ...panelBarSx,
  color: 'primary.main',
  px: 2,
  py: 1.1,
};

const titleTextSx = {
  fontFamily: UI_FONTS.display,
  fontWeight: 700,
  fontSize: '0.74rem',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  lineHeight: 1.3,
};

// The title of a section inside a dialog's content.
export const dialogSectionTitleSx = {
  fontFamily: UI_FONTS.display,
  fontSize: '0.7rem',
  fontWeight: 800,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'primary.main',
};

// Base content padding. Top padding uses the `&.MuiDialogContent-root`
// selector to match the specificity of MUI's default
// `.MuiDialogTitle-root + .MuiDialogContent-root { padding-top: 0 }` rule —
// a plain `pt` loses to it and is silently ignored. The gap below the title
// bar is set via the `topPad` prop.
const contentSx = { position: 'relative', bgcolor: uiAlpha(UI_COLORS.surfaceDeep, 0.98), px: 2.25, pb: 2 };

const cornerCloseSx = { position: 'absolute', top: 8, right: 8, zIndex: 1, color: 'text.secondary' };

const actionsSx = {
  px: 2.25,
  py: 1.25,
  gap: 0.75,
  bgcolor: uiAlpha(UI_COLORS.surfaceDeep, 0.98),
  borderTop: 1,
  borderColor: 'divider',
  // Small Cinzel buttons matching the sheet's button scale.
  '& .MuiButton-root': {
    fontFamily: UI_FONTS.display,
    fontSize: '0.62rem',
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    minWidth: 0,
    px: 1.4,
    py: 0.35,
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
