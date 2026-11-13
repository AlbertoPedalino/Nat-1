import { Box } from '@mui/material';
import { UI_COLORS, OPACITY } from './colors.js';

// The mark of colour at the head of a card's name that says what kind of
// thing it is at a glance: an action's category (action, bonus, reaction), an
// item's rarity. Drawn as a looter's gem shard: a long crystal pointed at both
// ends, inked like everything else, cel-shaded with a hard band of light down
// its left face. One mark for every card that carries one, so a kind reads
// the same in every list. `tone` is a palette colour or a theme path.
const WIDTH = 12;
const HEIGHT = 30;
const TIP = 7;
const MID = WIDTH / 2;
// The shard's outline; its lit left face and its shaded right face, each a
// hard band (cel shading), inside the ink.
const SHARD = `M${MID} 1 L${WIDTH - 1.5} ${TIP} L${WIDTH - 1.5} ${HEIGHT - TIP} L${MID} ${HEIGHT - 1} L1.5 ${HEIGHT - TIP} L1.5 ${TIP} Z`;
const LIGHT = `M${MID} 3 L${MID - 0.5} ${HEIGHT - 4} L2.6 ${HEIGHT - TIP - 0.5} L2.6 ${TIP + 0.5} Z`;
const SHADE = `M${MID + 1.2} 5 L${WIDTH - 2.6} ${TIP + 1} L${WIDTH - 2.6} ${HEIGHT - TIP - 1} L${MID + 1.2} ${HEIGHT - 5} Z`;

export default function ToneBar({ tone }) {
  if (!tone) return null;
  return (
    <Box
      component="svg"
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      aria-hidden
      sx={{ width: WIDTH, height: HEIGHT, flexShrink: 0, display: 'block', overflow: 'visible', color: tone }}
    >
      <path d={SHARD} fill="currentColor" stroke={UI_COLORS.edge} strokeWidth={1.6} strokeLinejoin="round" />
      <path d={LIGHT} fill={UI_COLORS.white} fillOpacity={OPACITY.edge} />
      <path d={SHADE} fill={UI_COLORS.black} fillOpacity={OPACITY.shade} />
    </Box>
  );
}
