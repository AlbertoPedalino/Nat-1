import { Box } from '@mui/material';
import { X } from 'lucide-react';
import TipIconButton from '../../../shared/ui/TipIconButton.jsx';
import { ICON_SIZES } from '../../../shared/ui/iconSizes.js';
import MapFloatingPanel from './MapFloatingPanel.jsx';
import { mapIconButtonSx } from './battleMapSurface.js';

// How far under the top of the corner strip a panel starts: the icon button,
// plus the gap that keeps it from touching one.
export const ICON_STRIP = 38;

// A round toggle in a top corner of the map with its panel hanging under it
// (the scene settings, the hexcrawl): one icon on the board until it is
// needed. Only as wide as its icon, and as tall as the strip it stands in, so
// opening it never shoves the corner's other buttons along, and the strip's
// height is what the panel measures its own against.
//
// `icon` (a lucide component) is shown closed, an X open. `label` names the
// toggle ("Picture settings"); `showTip` and `hideTip` are its tooltip closed
// and open. `onOpenChange(open)` is called on a click. `title`, `actions` and
// `children` are the panel's (MapFloatingPanel).
export default function MapCornerPopout({
  icon: Icon, label, showTip, hideTip, open = false, onOpenChange, title, actions, children,
}) {
  return (
    <Box sx={cornerSx}>
      <TipIconButton
        title={open ? hideTip : showTip}
        size="small"
        ariaLabel={label}
        aria-expanded={open}
        onClick={() => onOpenChange?.(!open)}
        sx={buttonSx}
      >
        {open ? <X size={ICON_SIZES.md} /> : <Icon size={ICON_SIZES.md} />}
      </TipIconButton>
      {open ? (
        <MapFloatingPanel title={title} actions={actions} sx={panelSx}>
          {children}
        </MapFloatingPanel>
      ) : null}
    </Box>
  );
}

const cornerSx = {
  position: 'relative',
  display: 'flex',
  alignItems: 'flex-start',
  height: '100%',
  minHeight: 0,
};

// The strip around it is click-through; the icon and the panel are not.
const buttonSx = { ...mapIconButtonSx, pointerEvents: 'auto' };

// Bounded by the map rather than by the window: the map is a cell in the page
// and usually much shorter, and in fullscreen there is no page behind a panel
// to scroll. The strip it hangs from is the map's height, so `100%` is the
// map less the icon it hangs under.
const panelSx = {
  pointerEvents: 'auto',
  position: 'absolute',
  top: ICON_STRIP,
  left: 0,
  zIndex: 2,
  width: { xs: 240, sm: 290 },
  maxHeight: `calc(100% - ${ICON_STRIP}px)`,
};
