import { Snackbar, Alert, Portal, useMediaQuery, useTheme } from '@mui/material';
import { UI_COLORS, uiAlpha } from './colors.js';
import { UI_FONTS } from './fonts.js';
import { APP_TOP_BAR_HEIGHT } from './appBar.js';
import { activePortalContainer } from './portalContainer.js';

// One toast look for the whole app. MUI's default `filled` Alert uses the stock
// Material palette (bright green/red) which clashes with the parchment/gold
// theme — every screen rolled its own Snackbar, so they drifted apart (e.g. the
// logout toast looked nothing like the rest). Route all of them through here.
const SEVERITY_COLOR = {
  success: UI_COLORS.success,
  error: UI_COLORS.danger,
  warning: UI_COLORS.warningToast,
  info: UI_COLORS.blueLight,
};

// Just under the app's top bar on every screen: centred on a phone, at the
// right from a tablet up. Set per breakpoint so it wins over the Snackbar's own
// `top: 24px` media query, which put it over the bar on a desktop.
const TOP_BELOW_BAR = `calc(${APP_TOP_BAR_HEIGHT} + 10px + env(safe-area-inset-top, 0px))`;
const MOBILE_ANCHOR = { vertical: 'top', horizontal: 'center' };
const DESKTOP_ANCHOR = { vertical: 'top', horizontal: 'right' };

export default function AppToast({ toast, onClose, autoHideDuration = 3500 }) {
  const theme = useTheme();
  const color = SEVERITY_COLOR[toast?.severity] || SEVERITY_COLOR.info;

  // noSsr resolves the breakpoint from matchMedia on the first paint (same
  // pattern as CurrencyCoinBox). Phone: top centre; tablet and desktop: top right.
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'), { noSsr: true });

  return (
    // Portal to <body>: Snackbar is position:fixed but MUI doesn't portal it, so
    // it's positioned against the nearest ancestor that forms a containing block
    // (any `transform`/`filter`/`backdropFilter` — e.g. AppTopBar) instead of the
    // viewport. The Portal makes the fixed positioning viewport-relative no matter
    // where the toast is triggered from. Into the fullscreen element when there
    // is one (the battle map), or the browser would not paint it at all.
    <Portal container={activePortalContainer}>
      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={autoHideDuration}
        onClose={(_, reason) => { if (reason !== 'clickaway') onClose?.(); }}
        disableWindowBlurListener
        anchorOrigin={isMobile ? MOBILE_ANCHOR : DESKTOP_ANCHOR}
        sx={{ top: { xs: TOP_BELOW_BAR, sm: TOP_BELOW_BAR } }}
      >
        {toast ? (
          <Alert
            severity={toast.severity || 'info'}
            variant="outlined"
            onClose={onClose}
            sx={{
              fontFamily: UI_FONTS.prose,
              fontSize: '0.84rem',
              alignItems: 'center',
              minWidth: 240,
              maxWidth: 360,
              bgcolor: uiAlpha(UI_COLORS.surfaceDeep, 0.98),
              color: UI_COLORS.textToast,
              border: '1px solid',
              borderColor: color,
              borderRadius: 1,
              boxShadow: `0 6px 24px ${uiAlpha(UI_COLORS.black, 0.45)}`,
              '& .MuiAlert-icon': { color },
              '& .MuiAlert-action': { color: UI_COLORS.textSecondary },
            }}
          >
            {toast.msg}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Portal>
  );
}
