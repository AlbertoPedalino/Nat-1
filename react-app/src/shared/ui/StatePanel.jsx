import { Box, CircularProgress, Typography } from '@mui/material';
import { UI_FONTS } from './fonts.js';

// A page's whole-area state instead of its content (not configured, signed
// out, nothing on the table yet, restoring the session): an icon — or a
// spinner while `loading` — a title, a line of explanation and an action.
export default function StatePanel({
  icon: Icon, loading = false, title, children, action = null, sx,
}) {
  return (
    <Box role="status" sx={[panelSx, sx]}>
      {loading ? <CircularProgress size={26} /> : null}
      {!loading && Icon ? <Box component={Icon} size={28} aria-hidden sx={{ color: 'primary.main' }} /> : null}
      {title ? <Typography sx={titleSx}>{title}</Typography> : null}
      {children ? <Typography sx={messageSx}>{children}</Typography> : null}
      {action}
    </Box>
  );
}

const panelSx = {
  minHeight: 220,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 1.25,
  textAlign: 'center',
  p: { xs: 2.5, sm: 4 },
  border: '1px dashed',
  borderColor: 'divider',
  bgcolor: 'background.paper',
};

const titleSx = {
  fontFamily: UI_FONTS.display,
  color: 'text.primary',
  fontSize: '1rem',
  fontWeight: 700,
  letterSpacing: '0.05em',
};

const messageSx = { color: 'text.secondary', fontSize: '0.9rem', maxWidth: 520 };
