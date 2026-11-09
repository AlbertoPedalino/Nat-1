import { useMediaQuery, useTheme } from '@mui/material';

// Whether the screen is a phone's: below the theme's `sm` breakpoint. Read on
// the first render (noSsr), so a phone layout never flashes the wide one.
export function useIsPhone() {
  return useMediaQuery(useTheme().breakpoints.down('sm'), { noSsr: true });
}
