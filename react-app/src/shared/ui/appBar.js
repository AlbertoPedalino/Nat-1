import { FONT_SIZES } from './fonts.js';
import { iconOnlyOnPhoneButtonSx } from './iconOnlyOnPhone.js';
import { TEXT_STYLES } from './textStyles.js';

// The height of the app's top bar (app/navigation/AppTopBar.jsx), for anything
// that sits under it: page padding, sticky bars, the app toast.
export const APP_TOP_BAR_HEIGHT = '48px';

// The lettering of the bar's buttons, and the buttons themselves: every page's
// own button in the bar (Builder, Links, Import…) looks like Home and Back.
export const appTopBarFontSx = {
  ...TEXT_STYLES.title,
  fontSize: FONT_SIZES.xs,
  whiteSpace: 'nowrap',
};

export const appTopBarButtonSx = {
  ...appTopBarFontSx,
  ...iconOnlyOnPhoneButtonSx,
};
