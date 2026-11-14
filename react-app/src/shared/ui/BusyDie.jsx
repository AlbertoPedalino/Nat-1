import { Box } from '@mui/material';
import { BUSY_MOTION } from './motion.js';

// The app's own icon (public/favicon.svg, the logo's d20) turning while
// something is on the way or being done (a list loading, a save, an upload):
// the one "working" mark of the app, in place of MUI's spinning ring. The very
// file of the icon, so a new logo is the new working mark too. `size` in px.
const APP_ICON = `${import.meta.env?.BASE_URL || '/'}favicon.svg`;

// How large it turns: beside the words of a loading line, alone in the space
// a panel or a page would take. Inside a button it takes the button's icon
// size instead (the caller's `size`).
export const BUSY_SIZES = Object.freeze({ line: 32, area: 72 });

export default function BusyDie({ size = 16, label = 'Working', sx }) {
  return (
    <Box
      component="img"
      src={APP_ICON}
      alt=""
      role="progressbar"
      aria-label={label}
      draggable={false}
      sx={[frameSx(size), sx]}
    />
  );
}

function frameSx(size) {
  return {
    display: 'inline-block',
    width: size,
    height: size,
    flexShrink: 0,
    animation: `gbBusyDie ${BUSY_MOTION.turn}ms cubic-bezier(.5, 0, .5, 1) infinite`,
    '@keyframes gbBusyDie': { to: { transform: 'rotate(360deg)' } },
    '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
  };
}
