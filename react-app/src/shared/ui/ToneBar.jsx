import { useId } from 'react';
import { Box } from '@mui/material';
import { UI_COLORS, OPACITY } from './colors.js';
import { useStyleShapes } from './themeIds.js';

// The mark of colour at the head of a card's name that says what kind of
// thing it is at a glance: an action's category (action, bonus, reaction), an
// item's rarity. Its shape is the style's (shapes.js marker: the comic's gem
// shard, a coffin, a cartridge, a leaf…), its colour always the kind's, inked
// like everything else and cel-shaded with a hard band of light and of
// shade. One mark for every card that carries one, so a kind reads the same
// in every list. `tone` is a palette colour or a theme path.
const WIDTH = 12;
const HEIGHT = 30;
// The faces of a mark that draws none of its own: a band of light down its
// left, of shade down its right.
const LIGHT_BAND = `M0 0 H4.6 V${HEIGHT} H0 Z`;
const SHADE_BAND = `M7.4 0 H${WIDTH} V${HEIGHT} H7.4 Z`;

export default function ToneBar({ tone }) {
  const { marker } = useStyleShapes();
  const id = useId().replace(/[^\w-]/g, '');
  if (!tone) return null;
  const clip = `tone-${id}`;
  const glow = `tone-glow-${id}`;
  return (
    <Box
      component="svg"
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      aria-hidden
      shapeRendering={marker.crisp ? 'crispEdges' : undefined}
      sx={{ width: WIDTH, height: HEIGHT, flexShrink: 0, display: 'block', overflow: 'visible', color: tone }}
    >
      <defs>
        <clipPath id={clip}><path d={marker.outline} /></clipPath>
        {marker.glow ? <filter id={glow} x="-80%" y="-30%" width="260%" height="160%"><feGaussianBlur stdDeviation={2} /></filter> : null}
      </defs>
      {marker.glow ? <path d={marker.outline} fill="currentColor" opacity={OPACITY.heavy} filter={`url(#${glow})`} /> : null}
      <path d={marker.outline} fill="currentColor" stroke={UI_COLORS.edge} strokeWidth={1.6} strokeLinejoin={marker.crisp ? 'miter' : 'round'} />
      <g clipPath={`url(#${clip})`}>
        <path d={marker.light || LIGHT_BAND} fill={UI_COLORS.white} fillOpacity={marker.light ? OPACITY.edge : OPACITY.line} />
        <path d={marker.shade || SHADE_BAND} fill={UI_COLORS.black} fillOpacity={OPACITY.shade} />
        {marker.cap ? <path d={marker.cap} fill={marker.capFill ? UI_COLORS[marker.capFill] : UI_COLORS.edge} fillOpacity={marker.capFill ? 1 : OPACITY.strong} stroke={UI_COLORS.edge} strokeWidth={0.8} /> : null}
        {marker.lines ? <path d={marker.lines} fill="none" stroke={UI_COLORS.edge} strokeWidth={1} strokeOpacity={OPACITY.strong} strokeLinecap="round" /> : null}
      </g>
      {marker.pupil ? <path d={marker.pupil} fill={UI_COLORS.edge} /> : null}
      {marker.glitch ? <path d={marker.glitch} fill="currentColor" stroke={UI_COLORS.edge} strokeWidth={1} /> : null}
    </Box>
  );
}
