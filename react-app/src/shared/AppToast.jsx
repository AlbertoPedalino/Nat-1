import { Snackbar, Alert, useMediaQuery, useTheme } from '@mui/material';

// One toast look for the whole app. MUI's default `filled` Alert uses the stock
// Material palette (bright green/red) which clashes with the parchment/gold
// theme — every screen rolled its own Snackbar, so they drifted apart (e.g. the
// logout toast looked nothing like the rest). Route all of them through here.
const SEVERITY_COLOR = {
  success: '#58b879',
  error: '#de675f',
  warning: '#e0a33a',
  info: '#9ec5e6',
};

export default function AppToast({ toast, onClose, autoHideDuration = 3500, anchorOrigin }) {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('sm'));
  const color = SEVERITY_COLOR[toast?.severity] || SEVERITY_COLOR.info;

  return (
    <Snackbar
      open={Boolean(toast)}
      autoHideDuration={autoHideDuration}
      onClose={(_, reason) => { if (reason !== 'clickaway') onClose?.(); }}
      disableWindowBlurListener
      anchorOrigin={anchorOrigin || (isDesktop
        ? { vertical: 'top', horizontal: 'right' }
        : { vertical: 'bottom', horizontal: 'center' })}
      sx={{ top: isDesktop ? 104 : undefined, zIndex: 2000 }}
    >
      {toast ? (
        <Alert
          severity={toast.severity || 'info'}
          variant="outlined"
          onClose={onClose}
          sx={{
            fontFamily: '"EB Garamond", Georgia, serif',
            fontSize: '0.84rem',
            alignItems: 'center',
            minWidth: 240,
            maxWidth: 360,
            bgcolor: 'rgba(26,23,19,0.98)',
            color: '#edd9b0',
            border: '1px solid',
            borderColor: color,
            borderRadius: 1,
            boxShadow: '0 6px 24px rgba(0,0,0,0.45)',
            '& .MuiAlert-icon': { color },
            '& .MuiAlert-action': { color: '#bda98a' },
          }}
        >
          {toast.msg}
        </Alert>
      ) : undefined}
    </Snackbar>
  );
}
