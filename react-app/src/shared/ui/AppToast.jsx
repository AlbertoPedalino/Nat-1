import { Snackbar, Alert, AlertTitle, Portal } from '@mui/material';
import { UI_COLORS } from './colors.js';
import { UI_FONTS, FONT_SIZES } from './fonts.js';
import { APP_TOP_BAR_HEIGHT } from './appBar.js';
import { activePortalContainer } from './portalContainer.js';
import { useIsPhone } from './useIsPhone.js';
import { bubbleSx, bubbleTailSx } from './bubble.js';
import { TEXT_STYLES } from './textStyles.js';

// One toast look for the whole app. MUI's default `filled` Alert uses the stock
// Material palette (bright green/red) which clashes with the parchment/gold
// theme — every screen rolled its own Snackbar, so they drifted apart (e.g. the
// logout toast looked nothing like the rest). Route all of them through here.
const SEVERITY_COLOR = {
  success: UI_COLORS.success,
  error: UI_COLORS.danger,
  warning: UI_COLORS.warning,
  info: UI_COLORS.infoText,
};

// What the bubble shouts over its message, as a comic would: one short
// exclamation per kind of notice, in the comic's lettering. The message stays
// in the reading face, since an error can be a long sentence.
const SEVERITY_SHOUT = {
  success: 'Done!',
  error: 'Oops!',
  warning: 'Careful!',
  info: 'Heads up!',
};

// Just under the app's top bar on every screen: centred on a phone, at the
// right from a tablet up. Set per breakpoint so it wins over the Snackbar's own
// `top: 24px` media query, which put it over the bar on a desktop.
const TOP_BELOW_BAR = `calc(${APP_TOP_BAR_HEIGHT} + 10px + env(safe-area-inset-top, 0px))`;
const MOBILE_ANCHOR = { vertical: 'top', horizontal: 'center' };
const DESKTOP_ANCHOR = { vertical: 'top', horizontal: 'right' };

export default function AppToast({ toast, onClose, autoHideDuration = 3500 }) {
  const severity = SEVERITY_COLOR[toast?.severity] ? toast.severity : 'info';
  const color = SEVERITY_COLOR[severity];

  // noSsr resolves the breakpoint from matchMedia on the first paint (same
  // pattern as CurrencyCoinBox). Phone: top centre; tablet and desktop: top right.
  const isMobile = useIsPhone();

  return (
    // Portal to <body>: Snackbar is position:fixed but MUI doesn't portal it, so
    // it's positioned against the nearest ancestor that forms a containing block
    // (any `transform`/`filter`/`backdropFilter`) instead of the
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
            severity={severity}
            variant="outlined"
            onClose={onClose}
            sx={{
              fontFamily: UI_FONTS.prose,
              fontSize: FONT_SIZES.xl,
              // Icon and close beside the exclamation, the message under it.
              alignItems: 'flex-start',
              minWidth: 240,
              maxWidth: 360,
              // A speech bubble, its shadow in the notice's colour, its tail
              // pointing up at the bar it drops from.
              ...bubbleSx({ tone: color, pop: false }),
              ...bubbleTailSx({ side: 'top', at: '82%' }),
              position: 'relative',
              overflow: 'visible',
              color: UI_COLORS.textPrimary,
              '& .MuiAlert-icon': { color },
              '& .MuiAlert-action': { color: UI_COLORS.textSecondary },
            }}
          >
            <AlertTitle sx={{ ...TEXT_STYLES.shout, fontSize: FONT_SIZES.title, color, mb: 0.25 }}>
              {SEVERITY_SHOUT[severity]}
            </AlertTitle>
            {toast.msg}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Portal>
  );
}
