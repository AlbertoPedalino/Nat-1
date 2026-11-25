import { Box, Typography } from '@mui/material';
import { UI_COLORS } from '../../../shared/ui/colors.js';
import { inkOn, PRESS_MOTION_SX } from '../../../shared/ui/pressable.js';
import { PANEL_BADGE_BOX, panelFrameSx, panelTitleBarSx, panelTitleSx, STAT_TILE_SIZE, statValueSx } from '../../../shared/ui/PanelHeader.jsx';
import { inkCutShadow } from '../../../shared/ui/shadows.js';
import { CREST } from '../../../shared/ui/shapes.js';
import { PANEL_TONES } from '../../../shared/ui/entityColors.js';
import { useFitText } from '../../../shared/ui/useFitText.js';
import { useStyleShapes } from '../../../shared/ui/themeIds.js';
import { abilityLook, abilityPlace, abilityTile, drawsAbilities } from '../../../shared/ui/abilityDrawing.js';
import { BUBBLE_INK_SX } from '../../../shared/ui/bubble.js';
import MeasuredDrawing from '../../../shared/ui/MeasuredDrawing.jsx';

// A stat tile (AC, Initiative, Proficiency Bonus, Inspiration, the spell
// figures, the ability scores): a small panel of its own, drawn in the same
// language as the big ones — a bar with its screentone and its name, the figure
// big under it. Its name keeps a panel title's size where the tile has room
// and is shrunk to the bar where it has not (useFitText). It fills the height it is given, so a row of tiles stands as
// tall as the panel beside it, its frame and bar the same as that panel's.
// `tone` is the tile's own colour (PANEL_TONES: AC, Initiative, Proficiency
// Bonus and Inspiration each their own, the ability scores their panel's), or
// another to say something (an untrained shield, a check at disadvantage);
// without one a tile wears the theme's accent (the spell figures).
// `value` is the figure (a string or number) or a drawing; `clickable` lights
// its edge in its tone under the cursor; `active` fills the body with its tone
// (Inspiration held), its figure in the ink that reads on it. `crest` cuts the
// tile as a heraldic crest, pointed at the foot (the six ability scores), its
// ink edge and solid shadow following the cut; where the style draws the
// scores (shapes.js abilities.drawing), a crest is that drawing instead, the
// one at `place` in its row.
export default function StatTile({
  tone = PANEL_TONES.statTile, label, value, clickable = false, active = false, crest = false, place = 0, onClick, bodySx,
}) {
  const titleRef = useFitText(label);
  const { drawing } = useStyleShapes().abilities;
  if (crest && drawsAbilities(drawing)) {
    const { tilt, sink, head, under } = abilityPlace(drawing, place);
    return (
      <Box onClick={onClick} sx={[DRAWN_SX, abilityLook(drawing).paper && BUBBLE_INK_SX, { rotate: `${tilt}deg`, translate: `0 ${sink}px`, pt: `${head}px` }, clickable && DRAWN_CLICKABLE_SX]}>
        <MeasuredDrawing draw={(w, h) => abilityTile(drawing, w, h, place)} />
        {/* Lettered in the drawing's own ink; a tone only where it says something (a check at disadvantage). */}
        <Typography ref={titleRef} noWrap sx={{ ...panelTitleSx, color: tone === PANEL_TONES.abilityScores ? UI_COLORS.textPrimary : tone, minWidth: 0, maxWidth: '100%', mb: `${under}px` }}>{label}</Typography>
        {value}
      </Box>
    );
  }
  const content = (
    <>
      <Box sx={{ ...panelTitleBarSx(tone, { tile: true }), gap: 0, justifyContent: 'center' }}>
        <Box sx={{ width: 0, height: PANEL_BADGE_BOX, flexShrink: 0 }} />
        <Typography ref={titleRef} noWrap sx={{ ...panelTitleSx, color: tone, minWidth: 0 }}>{label}</Typography>
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

// A drawn score: its drawing behind it (a layer of its own), its name and
// figures stacked on it, leaning and sunk as its place has it (the individual
// transform properties, so a press still hops it).
const DRAWN_SX = {
  position: 'relative',
  isolation: 'isolate',
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  minWidth: Math.round(STAT_TILE_SIZE * 0.8),
  px: 0.25,
  pb: 1.5,
  transformOrigin: '50% 100%',
};

const DRAWN_CLICKABLE_SX = { ...PRESS_MOTION_SX, cursor: 'pointer' };

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
  p: CREST.edge,
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
};

// The figures stay clear of the point and of the crest's cut sides.
const CREST_FOOT_SX = { pb: CREST.foot, px: CREST.side };

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
