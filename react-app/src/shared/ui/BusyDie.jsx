import { Box } from '@mui/material';
import { BUSY_MOTION, STILL_WHEN_REDUCED, motionTime } from './motion.js';
import { publicAsset } from '../publicAsset.js';
import { appDieIcon, useDiceSet } from './DiceSetScope.jsx';
import { BASE_STYLE_ID } from './shapes.js';

// The app's own icon (the logo's d20, appDie.js) turning while something is on
// the way or being done (a list loading, a save, an upload): the one "working"
// mark of the app, in place of MUI's spinning ring. In the viewer's dice set:
// the comic set's is the very file of the icon (public/favicon.svg), so a new
// logo is the new working mark too. `size` in px.
const APP_ICON = publicAsset('favicon.svg');

// How large it turns: beside the words of a loading line, alone in the space
// a panel or a page would take. Inside a button it takes the button's icon
// size instead (the caller's `size`).
export const BUSY_SIZES = Object.freeze({ line: 32, area: 72 });

export default function BusyDie({ size = 16, label = 'Working', sx }) {
  const { id } = useDiceSet();
  return (
    <Box
      component="img"
      src={id === BASE_STYLE_ID ? APP_ICON : appDieIcon(id)}
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
    animation: `gbBusyDie ${motionTime(BUSY_MOTION.turn)} cubic-bezier(.5, 0, .5, 1) infinite`,
    '@keyframes gbBusyDie': { to: { transform: 'rotate(360deg)' } },
    ...STILL_WHEN_REDUCED,
  };
}
