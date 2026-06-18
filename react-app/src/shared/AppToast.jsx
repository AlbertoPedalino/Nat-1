import { Snackbar, Alert, Portal, useMediaQuery, useTheme } from '@mui/material';

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

// Desktop toasts sit below the sticky top bar; mobile toasts anchor to the bottom.
const DESKTOP_TOP_OFFSET = 104;
const MOBILE_ANCHOR = { vertical: 'bottom', horizontal: 'center' };
const DESKTOP_ANCHOR = { vertical: 'top', horizontal: 'right' };

export default function AppToast({ toast, onClose, autoHideDuration = 3500 }) {
  const theme = useTheme();
  const color = SEVERITY_COLOR[toast?.severity] || SEVERITY_COLOR.info;

  // noSsr resolves the breakpoint from matchMedia on the first paint (same
  // pattern as CurrencyCoinBox). Mobile anchors bottom-centre, desktop top-right.
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'), { noSsr: true });

  return (
    // Portal to <body>: Snackbar is position:fixed but MUI doesn't portal it, so
    // it's positioned against the nearest ancestor that forms a containing block
    // (any `transform`/`filter`/`backdropFilter` — e.g. AppTopBar) instead of the
    // viewport. The Portal makes the fixed positioning viewport-relative no matter
    // where the toast is triggered from.
    <Portal>
      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={autoHideDuration}
        onClose={(_, reason) => { if (reason !== 'clickaway') onClose?.(); }}
        disableWindowBlurListener
        anchorOrigin={isMobile ? MOBILE_ANCHOR : DESKTOP_ANCHOR}
        sx={{ top: isMobile ? undefined : DESKTOP_TOP_OFFSET }}
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
    </Portal>
  );
}
