import { Box, Stack, Typography } from '@mui/material';
import { X } from 'lucide-react';
import TipIconButton from '../../../shared/ui/TipIconButton.jsx';
import { ICON_SIZES } from '../../../shared/ui/iconSizes.js';
import { asArray } from '../../../shared/lists.js';
import { mapPanelButtonSx, mapPanelSx, mapPanelTitleSx } from './battleMapSurface.js';

// A panel floating over the battle map (the scene and hexcrawl corners, the
// tool rail's options): the map's glass, its title row, its content. A plain
// box rather than a Popover: a Popover lays an invisible backdrop over the map
// and portals to the document root, which a fullscreen map does not paint.
//
// `title` heads it. `actions` are the title row's icon buttons, as
// [{ title, icon, onClick }] (`title` is the tooltip and the button's name,
// "Hexcrawl settings"); `onClose`, when given, ends the row with a Close
// button. `sx` places and sizes the panel (position, width, a fade); every
// other prop goes to its root (data-viewport-control).
export default function MapFloatingPanel({
  title, actions = [], onClose, sx, children, ...rootProps
}) {
  return (
    <Box {...rootProps} sx={[mapPanelSx, ...asArray(sx)]}>
      <Stack direction="row" spacing={0.25} sx={titleRowSx}>
        <Typography sx={mapPanelTitleSx}>{title}</Typography>
        <Box sx={{ flex: 1 }} />
        {actions.map(({ title: tip, icon: Icon, onClick }) => (
          <TipIconButton key={tip} title={tip} size="small" onClick={onClick} sx={mapPanelButtonSx}>
            <Icon size={ICON_SIZES.sm} />
          </TipIconButton>
        ))}
        {onClose ? (
          <TipIconButton title="Close" size="small" onClick={onClose} sx={mapPanelButtonSx}>
            <X size={ICON_SIZES.sm} />
          </TipIconButton>
        ) : null}
      </Stack>
      {children}
    </Box>
  );
}

const titleRowSx = { alignItems: 'center', mb: 1 };
