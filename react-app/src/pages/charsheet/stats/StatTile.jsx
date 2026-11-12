import { Box, Typography } from '@mui/material';
import { UI_COLORS } from '../../../shared/ui/colors.js';
import { inkOn } from '../../../shared/ui/pressable.js';
import { PANEL_BADGE_BOX, panelBarPadSx, panelFrameSx, panelBarSx, panelScreentone, STAT_TILE_SIZE, tileTitleSx, statValueSx } from '../../../shared/ui/PanelHeader.jsx';
import { PRESS_MOTION_SX } from '../../../shared/ui/pressable.js';

// A stat tile (AC, Initiative, Proficiency Bonus, Inspiration): a small panel
// of its own, each with its own meaning, drawn in the same language as the
// big ones — a bar in its tone with its screentone and its name, the figure
// big under it. It fills the height it is given, so a row of tiles stands as
// tall as the panel beside it, its frame and bar the same as that panel's.
// `value` is the figure (a string or number) or a drawing; `clickable` lights its edge in its tone under the cursor; `active` fills
// the body with its tone (Inspiration held), its figure in the ink that reads
// on it.
export default function StatTile({ tone, label, value, clickable = false, active = false, onClick, bodySx }) {
  return (
    <Box onClick={onClick} sx={{ ...tileFrameSx, ...(clickable ? clickableSx(tone) : null) }}>
      <Box sx={{ ...panelBarSx, ...panelBarPadSx, px: 0.5, gap: 0, backgroundImage: panelScreentone(tone), justifyContent: 'center' }}>
        <Box sx={{ width: 0, height: PANEL_BADGE_BOX, flexShrink: 0 }} />
        <Typography noWrap sx={{ ...tileTitleSx, color: tone }}>{label}</Typography>
      </Box>
      <Box sx={{ ...bodyBaseSx, ...(active ? { bgcolor: tone, color: inkOn(tone) } : null), ...bodySx }}>
        {typeof value === 'string' || typeof value === 'number'
          ? <Typography sx={{ ...statValueSx, ...(active ? { color: inkOn(tone) } : null) }}>{value}</Typography>
          : value}
      </Box>
    </Box>
  );
}

const tileFrameSx = {
  ...panelFrameSx,
  bgcolor: 'background.paper',
  borderRadius: 1,
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  minWidth: Math.round(STAT_TILE_SIZE * 0.8),
};

const bodyBaseSx = {
  flex: 1,
  minHeight: Math.round(STAT_TILE_SIZE * 0.7),
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  position: 'relative',
  bgcolor: UI_COLORS.surfaceHeader,
};

// A tile you press (Initiative rolls, Inspiration toggles) answers like a
// button: it hops up under the cursor and squashes when pressed, its edge in
// its tone; a tile only read (AC, Proficiency Bonus) stays put.
function clickableSx(tone) {
  return {
    ...PRESS_MOTION_SX,
    cursor: 'pointer',
    '&:hover': { ...PRESS_MOTION_SX['&:hover'], borderColor: tone },
  };
}
