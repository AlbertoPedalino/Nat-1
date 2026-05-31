import { Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Stack, Typography } from '@mui/material';
import { X } from 'lucide-react';

// Dialog chrome that matches the character-sheet panels (dark surface, gold
// left-accent header bar, uppercase Cinzel title) so dialogs feel native to
// the sheet rather than like plain MUI popups. Buttons use the sheet's small
// Cinzel scale. Single source for every sheet dialog; pass `headerRight` for
// title-bar extras (counts, a Clear button) and `actions` for the button bar.

const paperSx = {
  bgcolor: 'rgba(26,23,19,0.98)',
  border: 1,
  borderColor: 'divider',
  borderRadius: 2,
  backgroundImage: 'none',
  boxShadow: '0 18px 52px rgba(0,0,0,0.62)',
};

const titleSx = {
  display: 'flex',
  alignItems: 'center',
  gap: 1,
  bgcolor: 'rgba(35,32,26,1)',
  borderBottom: 1,
  borderColor: 'divider',
  borderLeft: 3,
  borderLeftColor: 'primary.main',
  color: 'primary.main',
  px: 2,
  py: 1.1,
};

const titleTextSx = {
  fontFamily: '"Cinzel", Georgia, serif',
  fontWeight: 700,
  fontSize: '0.74rem',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  lineHeight: 1.3,
};

// Extra top padding so the body breathes below the accent bar.
const contentSx = { bgcolor: 'rgba(26,23,19,0.98)', px: 2.25, pt: 3.25, pb: 2 };

const actionsSx = {
  px: 2.25,
  py: 1.25,
  gap: 0.75,
  bgcolor: 'rgba(26,23,19,0.98)',
  borderTop: 1,
  borderColor: 'divider',
  // Small Cinzel buttons matching the sheet's button scale.
  '& .MuiButton-root': {
    fontFamily: '"Cinzel", Georgia, serif',
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
  contentSx: contentSxOverride,
  ...props
}) {
  const right = showClose
    ? <>{headerRight}<IconButton size="small" onClick={onClose} sx={{ color: 'text.secondary' }}><X size={16} /></IconButton></>
    : headerRight;
  return (
    <Dialog open={open} onClose={onClose} maxWidth={maxWidth} fullWidth={fullWidth} slotProps={{ paper: { sx: paperSx } }} {...props}>
      {title != null ? (
        <DialogTitle sx={titleSx}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ width: '100%' }}>
            {icon}
            <Typography component="span" sx={titleTextSx}>{title}</Typography>
            {right != null ? <><span style={{ flex: 1 }} />{right}</> : null}
          </Stack>
        </DialogTitle>
      ) : null}
      <DialogContent sx={{ ...contentSx, ...contentSxOverride }}>{children}</DialogContent>
      {actions != null ? <DialogActions sx={actionsSx}>{actions}</DialogActions> : null}
    </Dialog>
  );
}
