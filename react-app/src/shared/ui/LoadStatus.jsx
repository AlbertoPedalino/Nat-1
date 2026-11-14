import { Alert, Stack, Typography } from '@mui/material';
import BusyDie, { BUSY_SIZES } from './BusyDie.jsx';
import { FONT_SIZES } from './fonts.js';
import { TEXT_STYLES } from './textStyles.js';

// The one "loading" look: the app's turning icon (BusyDie) with what is on the
// way, both large enough to find at a glance. In a row, or `centered` in the
// space a whole panel or page would take.
export function LoadingLine({ label = 'Loading…', centered = false, sx }) {
  return (
    <Stack
      role="status"
      direction={centered ? 'column' : 'row'}
      spacing={centered ? 2 : 1.25}
      sx={[centered ? centeredSx : rowSx, sx]}
    >
      <BusyDie size={centered ? BUSY_SIZES.area : BUSY_SIZES.line} />
      <Typography sx={centered ? centeredLabelSx : labelSx}>{label}</Typography>
    </Stack>
  );
}

// The one "could not" look: what went wrong, in an error alert. A load that
// failed, a save that was refused, a scene that could not be opened. A field
// that is filled in wrong says so under the field instead.
export function ErrorLine({ children, sx }) {
  return <Alert severity="error" sx={sx}>{children}</Alert>;
}

// What a panel shows while its data is on the way, or when it could not come:
// LoadingLine, or ErrorLine. Nothing once it is ready.
export default function LoadStatus({ status, loadingLabel = 'Loading…', errorMessage }) {
  if (status === 'loading' || status === 'idle') return <LoadingLine label={loadingLabel} sx={{ p: 2 }} />;
  if (status === 'error') return <ErrorLine sx={{ m: 1 }}>{errorMessage}</ErrorLine>;
  return null;
}

export function isLoadPending(status) {
  return status === 'loading' || status === 'idle' || status === 'error';
}

const rowSx = { alignItems: 'center' };
const labelSx = { ...TEXT_STYLES.title, fontSize: FONT_SIZES.body, color: 'text.primary' };
const centeredLabelSx = { ...labelSx, fontSize: FONT_SIZES.title };
const centeredSx = { alignItems: 'center', justifyContent: 'center', py: 4 };
