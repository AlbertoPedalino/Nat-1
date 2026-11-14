import { Box } from '@mui/material';
import { UI_COLORS, OPACITY, uiAlpha } from './colors.js';
import { meterTrackSx } from './surfaces.js';
import { METER_SEGMENTS } from './shapes.js';
import { DURATIONS, METER_MOTION } from './motion.js';
import { useLiveStyle } from './liveStyle.js';
import { clamp } from '../numbers.js';
import { asArray } from '../lists.js';

// A meter as one strip: the app's meter track (meterTrackSx), cut into
// `segments` like a game's health bar (METER_SEGMENTS), its fill
// `ratio` (0–1) wide in `tone`. A loss leaves the lost stretch pale for a beat
// before it drains, so a hit reads at a glance; a gain fills at once.
// `children` ride over the strip, centred (its figures). `title` names it and
// `valueText` says its value aloud ("15 of 60 hit points"). Every bar whose
// share changes is drawn here — the hit point bars (HitPointBars), the XP bar,
// a resource's bar, the carried weight — never as a width in sx (guarded):
// each share there would be a style rule of its own. `sx` sizes it (a height,
// a width, a thinner edge for a small piece); the other props are the strip's
// own (a bar dragged to set it takes its pointer handlers).
//
// Light on purpose, as a map holds dozens: the look is one fixed class for
// every bar, and only the share and the tone change on the element
// (useLiveStyle), so no value mints a style rule of its own; the fill moves
// by transform, which never lays the page out again.
export default function SegmentedMeter({
  ratio, tone, segments = METER_SEGMENTS.bar, title, valueText, children = null, sx, ...props
}) {
  const share = clamp(Number(ratio) || 0, 0, 1);
  // A string: a bare number would be written as pixels.
  const ref = useLiveStyle({ '--meter-share': String(share), '--meter-tone': tone });
  return (
    <Box
      {...props}
      ref={ref}
      role="meter"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(share * 100)}
      aria-valuetext={valueText}
      aria-label={title}
      title={title}
      sx={[TRACK_SX, segmentsSx(segments), ...asArray(sx)]}
    >
      <Box sx={LAG_SX} />
      <Box sx={FILL_SX} />
      {children != null ? <Box component="span" sx={FIGURES_SX}>{children}</Box> : null}
    </Box>
  );
}

const TRACK_SX = { ...meterTrackSx(10), position: 'relative', overflow: 'hidden' };

// The cuts between segments (METER_SEGMENTS, shapes.js), over the fill, in
// the track's own ink. One rule per segment count, made once; none for a
// smooth strip.
const SEGMENT_RULES = new Map();
function segmentsSx(segments) {
  const count = Math.round(Number(segments) || 0);
  if (count < 2) return null;
  if (!SEGMENT_RULES.has(count)) {
    const step = 100 / count;
    SEGMENT_RULES.set(count, {
      '&::after': {
        content: '""',
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        backgroundImage: `repeating-linear-gradient(90deg, transparent 0 calc(${step}% - 1.5px), ${uiAlpha(UI_COLORS.edge, OPACITY.strong)} calc(${step}% - 1.5px) ${step}%)`,
      },
    });
  }
  return SEGMENT_RULES.get(count);
}

const LAYER_SX = {
  position: 'absolute',
  inset: 0,
  transformOrigin: 'left center',
  transform: 'scaleX(var(--meter-share, 0))',
};

const FILL_SX = {
  ...LAYER_SX,
  bgcolor: 'var(--meter-tone)',
  transition: `transform ${DURATIONS.fast}ms ease-out`,
  '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
};

// The stretch just lost: pale, held for a beat, then drained. Under the fill,
// so a heal (the fill growing past it) never shows it. A share lowered by a
// larger maximum drains the same way: the bar shows the share, not the hit.
const LAG_SX = {
  ...LAYER_SX,
  bgcolor: UI_COLORS.accentHighlight,
  transition: `transform ${METER_MOTION.drain}ms ease-in ${METER_MOTION.hold}ms`,
  '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
};

// The figures fill the strip's height and sit in its middle, as a flex item
// whatever their own size: set in a line of the page's font, a smaller figure
// stood on that font's baseline and the strip's bottom cut it in half.
const FIGURES_SX = {
  position: 'absolute',
  inset: 0,
  zIndex: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};
