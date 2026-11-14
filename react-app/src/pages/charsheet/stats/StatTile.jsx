import { Box, Typography } from '@mui/material';
import { UI_COLORS } from '../../../shared/ui/colors.js';
import { inkOn } from '../../../shared/ui/pressable.js';
import { PANEL_BADGE_BOX, panelFrameSx, panelTitleBarSx, STAT_TILE_SIZE, tileTitleSx, statValueSx } from '../../../shared/ui/PanelHeader.jsx';
import { PRESS_MOTION_SX } from '../../../shared/ui/pressable.js';
import { inkCutShadow } from '../../../shared/ui/shadows.js';
import { CREST } from '../../../shared/ui/shapes.js';

// A stat tile (AC, Initiative, Proficiency Bonus, Inspiration): a small panel
// of its own, each with its own meaning, drawn in the same language as the
// big ones — a bar in its tone with its screentone and its name, the figure
// big under it. It fills the height it is given, so a row of tiles stands as
// tall as the panel beside it, its frame and bar the same as that panel's.
// `value` is the figure (a string or number) or a drawing; `clickable` lights
// its edge in its tone under the cursor; `active` fills the body with its tone
// (Inspiration held), its figure in the ink that reads on it. `crest` cuts the
// tile as a heraldic crest, pointed at the foot (the six ability scores), its
// ink edge and solid shadow following the cut.
export default function StatTile({
  tone, label, value, clickable = false, active = false, crest = false, onClick, bodySx,
}) {
  const content = (
    <>
      <Box sx={{ ...panelTitleBarSx(tone, { tile: true }), gap: 0, justifyContent: 'center' }}>
        <Box sx={{ width: 0, height: PANEL_BADGE_BOX, flexShrink: 0 }} />
        <Typography noWrap sx={{ ...tileTitleSx, color: tone }}>{label}</Typography>
      </Box>
      <Box sx={{ ...bodyBaseSx, ...(crest ? CREST_FOOT_SX : null), ...(active ? { bgcolor: tone, color: inkOn(tone) } : null), ...bodySx }}>
        {typeof value === 'string' || typeof value === 'number'
          ? <Typography sx={{ ...statValueSx, ...(active ? { color: inkOn(tone) } : null) }}>{value}</Typography>
          : value}
      </Box>
    </>
  );
  if (!crest) {
    return <Box onClick={onClick} sx={{ ...tileFrameSx, ...(clickable ? clickableSx(tone) : null) }}>{content}</Box>;
  }
  // A cut shape drops a box's border and shadow, so the crest is drawn in
  // layers: the shadow on the outside (a filter, which follows the cut), the
  // ink cut to the crest, and the face cut to a crest an edge smaller on it.
  return (
    <Box onClick={onClick} sx={{ ...crestSx, ...(clickable ? crestClickableSx(tone) : null) }}>
      <Box className="crest-ink" sx={crestInkSx}>
        <Box sx={crestFaceSx}>{content}</Box>
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
  // The tile's own width sizes its name (tileTitleSx).
  containerType: 'inline-size',
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

// The crest's cut, its ink and its foot are shapes.js's (CREST).
const crestSx = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  minWidth: Math.round(STAT_TILE_SIZE * 0.8),
  filter: inkCutShadow(),
};

const crestInkSx = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  p: `${CREST.edge}px`,
  bgcolor: UI_COLORS.edge,
  clipPath: CREST.clip,
  transition: PRESS_MOTION_SX.transition,
};

const crestFaceSx = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  bgcolor: 'background.paper',
  clipPath: CREST.clip,
  // The tile's own width sizes its name (tileTitleSx).
  containerType: 'inline-size',
};

// The figures stay clear of the point.
const CREST_FOOT_SX = { pb: CREST.foot };

// A crest you press hops as a tile does, its ink edge lit in its tone.
function crestClickableSx(tone) {
  return {
    ...PRESS_MOTION_SX,
    cursor: 'pointer',
    '&:hover': { ...PRESS_MOTION_SX['&:hover'], '& .crest-ink': { bgcolor: tone } },
  };
}

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
