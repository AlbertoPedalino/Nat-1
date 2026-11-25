import { Box, Snackbar, Alert, AlertTitle, Portal } from '@mui/material';
import { UI_COLORS } from './colors.js';
import { FONT_SIZES } from './fonts.js';
import { APP_TOP_BAR_HEIGHT } from './appBar.js';
import { activePortalContainer } from './portalContainer.js';
import { useIsPhone } from './useIsPhone.js';
import { bubbleSx } from './bubble.js';
import { TEXT_STYLES } from './textStyles.js';
import BubbleHeader from './BubbleHeader.jsx';
import { useStyleShapes } from './themeIds.js';
import { drawsNotice, noticeFrame, noticeLook } from './noticeDrawing.js';
import MeasuredDrawing from './MeasuredDrawing.jsx';
import { PLAIN_LETTERING } from './shadows.js';

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

// A notice the style draws in place of its bubble (shapes.js notice.drawing,
// noticeDrawing.js): nothing of the bubble's, the drawing behind what it says,
// lettered in the ink that reads on what is drawn; the drawing carries the
// severity's colour and mark, so the alert's own icon is left out.
const DRAWN_FRAME_SX = { position: 'relative', isolation: 'isolate' };
// The air round what is written on a drawn notice, px, before the room its
// drawing keeps (noticeLook).
const DRAWN_PAD = 24;
// A strip, long and low: its words in the drawing's ink, clear of what the
// drawing carries at its ends; its title printed plain (an inked outline and
// shadow would blot dark letters on paper).
function drawnSx({ ink, left, right }) {
  return {
    position: 'relative',
    overflow: 'visible',
    border: 'none',
    backgroundColor: 'transparent',
    boxShadow: 'none',
    color: UI_COLORS[ink],
    minWidth: 320,
    maxWidth: 440,
    pl: `${DRAWN_PAD + left}px`,
    pr: `${DRAWN_PAD + right}px`,
    py: 1.5,
    '& .MuiAlert-icon': { display: 'none' },
    '& .MuiAlert-message': { flex: 1, minWidth: 0 },
    '& .MuiAlertTitle-root': { ...PLAIN_LETTERING, color: UI_COLORS[ink] },
  };
}

export default function AppToast({ toast, onClose, autoHideDuration = 3500 }) {
  const severity = SEVERITY_COLOR[toast?.severity] ? toast.severity : 'info';
  const color = SEVERITY_COLOR[severity];
  const { drawing } = useStyleShapes().notice;
  const drawn = drawsNotice(drawing);
  const look = drawn ? noticeLook(drawing) : null;
  // A drawn notice stands in a box of its own, the drawing behind it and to
  // its size (the alert keeps its words in a box of their own, narrower),
  // with room under it for what hangs from it.
  const framed = (alert) => (drawn ? (
    <Box sx={[DRAWN_FRAME_SX, { mb: `${look.under}px` }]}>
      <MeasuredDrawing draw={(w, h) => noticeFrame(drawing, w, h, severity)} />
      {alert}
    </Box>
  ) : alert);

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
        {toast ? framed(
          <Alert
            severity={severity}
            variant="outlined"
            sx={{
              ...TEXT_STYLES.prose,
              fontSize: FONT_SIZES.xl,
              // Icon and close beside the exclamation, the message under it.
              alignItems: 'flex-start',
              minWidth: 240,
              maxWidth: 360,
              // The style's bubble, its shadow in the notice's colour; no tail:
              // a notice speaks from nothing on the screen. Or what the style
              // draws in its place, with room under it for what hangs from it.
              ...(drawn ? drawnSx(look) : {
                ...bubbleSx({ tone: color, pop: false }),
                position: 'relative',
                overflow: 'visible',
                color: UI_COLORS.textPrimary,
                '& .MuiAlert-icon': { color },
              }),
            }}
          >
            <BubbleHeader onClose={onClose}>
              <AlertTitle sx={{ ...TEXT_STYLES.shout, fontSize: FONT_SIZES.title, color, mb: 0.25 }}>
                {SEVERITY_SHOUT[severity]}
              </AlertTitle>
            </BubbleHeader>
            {toast.msg}
          </Alert>,
        ) : undefined}
      </Snackbar>
    </Portal>
  );
}
