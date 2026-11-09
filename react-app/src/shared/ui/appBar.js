import { UI_FONTS, FONT_SIZES, LETTER_SPACINGS } from './fonts.js';
import { iconOnlyOnPhoneButtonSx } from './iconOnlyOnPhone.js';

// The height of the app's top bar (app/navigation/AppTopBar.jsx), for anything
// that sits under it: page padding, sticky bars, the app toast.
export const APP_TOP_BAR_HEIGHT = '48px';

// The lettering of the bar's buttons, and the buttons themselves: every page's
// own button in the bar (Builder, Links, Import…) looks like Home and Back.
export const appTopBarFontSx = {
  fontFamily: UI_FONTS.display,
  fontSize: FONT_SIZES.xs,
  letterSpacing: LETTER_SPACINGS.lg,
  whiteSpace: 'nowrap',
};

export const appTopBarButtonSx = {
  ...appTopBarFontSx,
  ...iconOnlyOnPhoneButtonSx,
};
