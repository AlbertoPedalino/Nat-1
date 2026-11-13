import { useEffect, useRef, useState } from 'react';
import { Box, darken, lighten } from '@mui/material';
import { UI_COLORS, uiAlpha, OPACITY } from './colors.js';
import { PANEL_TONES } from './entityColors.js';
import { focusRingSx } from './interactive.js';
import { DURATIONS, GEM_MOTION } from './motion.js';
import { SPARKLE_PATH } from './BubbleSparkles.jsx';

// Every counter of the sheet that is spent and recovered one at a time — a
// spell slot, a pact slot, a feature's uses, a free cast, a hit die — is a
// row of gems: a lit, faceted gem while it is there to spend, its empty
// setting once it is spent. Drawn in the app's comic hand: an inked outline,
// flat cel-shaded facets lit from the top left, a white glint and the solid
// shadow under it every pressable thing has. A gem relit pops with a few
// sparkles; one spent sinks with a wobble (none for reduced motion).
//
// The cut, the colours and the sizes live here only (GEM_CUT, GEM_TONES,
// GEM_SIZES): a new look for every counter is a change to this file.
//
// - `available`: lit (there to spend) or an empty setting (spent).
// - `kind`: what it counts, which sets its colour (GEM_TONES).
// - `size`: 'md' in a panel of its own, 'sm' inside a card's row.
// - `selected`: ringed in the accent, lifted (a hit die chosen to spend).
// - `onClick` makes it a button; without one it only shows.
// Other props (aria-label, title, disabled…) go to the element.

// The cut, in a 100-unit box: a pointy-top hexagon, its table (the flat top
// facet) set up and left so the facets round it catch the light unevenly.
const GEM_CUT = Object.freeze({
  outer: hexagon(50, 46, 44, 45),
  inner: hexagon(47, 43, 23, 23.5),
  shadowDrop: 6,
});

export const GEM_TONES = Object.freeze({
  slot: UI_COLORS.info,
  pact: UI_COLORS.spell,
  uses: UI_COLORS.accent,
  temporary: UI_COLORS.success,
  hitDice: PANEL_TONES.hitPoints,
});

// Sizes easy to hit with a finger: 'md' in a panel of its own, 'sm' inside a
// card's row.
export const GEM_SIZES = Object.freeze({ md: 26, sm: 22 });

function hexagon(cx, cy, rx, ry) {
  return Array.from({ length: 6 }, (_, i) => {
    const angle = -Math.PI / 2 + (i * Math.PI) / 3;
    return [cx + rx * Math.cos(angle), cy + ry * Math.sin(angle)];
  });
}

const points = (list) => list.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');

// Light from the top left: a facet facing it is lit, one facing away is in
// shade, the others keep the gem's own colour.
const FACETS = GEM_CUT.outer.map((from, i) => {
  const to = GEM_CUT.outer[(i + 1) % 6];
  const shape = points([from, to, GEM_CUT.inner[(i + 1) % 6], GEM_CUT.inner[i]]);
  const mx = (from[0] + to[0]) / 2 - 50;
  const my = (from[1] + to[1]) / 2 - 46;
  const facing = (mx * -0.6 + my * -0.8) / Math.hypot(mx, my);
  return { shape, shade: facing > 0.35 ? 'light' : facing < -0.35 ? 'dark' : 'base' };
});
const OUTER = points(GEM_CUT.outer);
const INNER = points(GEM_CUT.inner);
const SHADOW = points(GEM_CUT.outer.map(([x, y]) => [x, y + GEM_CUT.shadowDrop]));
const SETTING_RIM = points(GEM_CUT.outer.map(([x, y]) => [50 + (x - 50) * 0.78, 46 + (y - 46) * 0.78 + 3]));

// A tone's flat shades, worked out once.
const shadesCache = new Map();
function shadesOf(tone) {
  if (!shadesCache.has(tone)) {
    shadesCache.set(tone, {
      light: lighten(tone, 0.38),
      base: tone,
      dark: darken(tone, 0.42),
      table: lighten(tone, 0.18),
      rim: uiAlpha(tone, OPACITY.line),
    });
  }
  return shadesCache.get(tone);
}

// Where the sparkles of a relit gem fly to, as fractions of its size.
const SPARKS = [[-0.9, -0.7], [0.95, -0.55], [0.85, 0.75], [-0.8, 0.8]];

export default function GemPip({
  available, kind = 'slot', size = 'md', selected = false, onClick, sx, ...props
}) {
  const px = GEM_SIZES[size] || GEM_SIZES.md;
  const shades = shadesOf(GEM_TONES[kind] || GEM_TONES.slot);
  const interactive = typeof onClick === 'function';
  const motion = useStateChangeMotion(available);
  const outline = px >= GEM_SIZES.md ? 2.2 : 1.9;

  return (
    <Box
      component={interactive ? 'button' : 'span'}
      type={interactive ? 'button' : undefined}
      onClick={onClick}
      sx={[gemBoxSx(px, interactive, selected), sx]}
      {...props}
    >
      <Box
        component="svg"
        viewBox="0 0 100 100"
        aria-hidden
        sx={[svgSx, motion.state ? MOTION_SX[motion.state] : null]}
        onAnimationEnd={motion.done}
      >
        {available ? (
          <>
            <polygon points={SHADOW} fill={UI_COLORS.edge} />
            {FACETS.map((facet) => (
              <polygon key={facet.shape} points={facet.shape} fill={shades[facet.shade]} {...FACET_LINE} />
            ))}
            <polygon points={INNER} fill={shades.table} {...FACET_LINE} />
            <path d="M34 30 l12 -7 l3 5 l-12 7 z" fill={UI_COLORS.white} />
            <circle cx="62" cy="25" r="3.4" fill={UI_COLORS.white} opacity={0.85} />
          </>
        ) : (
          <>
            <polygon points={OUTER} fill={UI_COLORS.surfaceSunken} />
            <polygon points={SETTING_RIM} fill="none" stroke={shades.rim} strokeWidth={1.3} vectorEffect="non-scaling-stroke" />
          </>
        )}
        <polygon
          points={OUTER}
          fill="none"
          stroke={selected ? UI_COLORS.accent : UI_COLORS.edge}
          strokeWidth={selected ? outline + 0.6 : outline}
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </Box>
      {motion.state === 'relit' ? SPARKS.map(([dx, dy], index) => (
        <Box
          key={index}
          component="svg"
          viewBox="0 0 24 24"
          aria-hidden
          sx={sparkSx(px, dx, dy, index)}
        >
          <path d={SPARKLE_PATH} fill={UI_COLORS.accentHighlight} stroke={UI_COLORS.edge} strokeWidth={2.2} strokeLinejoin="round" />
        </Box>
      )) : null}
    </Box>
  );
}

// 'relit' or 'spent' for the one animation after `available` changes (never
// on the first draw: a sheet opens still), then nothing again.
function useStateChangeMotion(available) {
  const previous = useRef(available);
  const [state, setState] = useState(null);
  useEffect(() => {
    if (previous.current === available) return;
    previous.current = available;
    setState(available ? 'relit' : 'spent');
  }, [available]);
  return { state, done: () => setState(null) };
}

const FACET_LINE = Object.freeze({
  stroke: UI_COLORS.edge, strokeOpacity: 0.55, strokeWidth: 0.9, vectorEffect: 'non-scaling-stroke',
});

function gemBoxSx(px, interactive, selected) {
  return {
    all: 'unset',
    boxSizing: 'border-box',
    position: 'relative',
    flexShrink: 0,
    display: 'inline-grid',
    placeItems: 'center',
    width: px,
    height: px,
    borderRadius: 1,
    cursor: interactive ? 'pointer' : 'default',
    transition: `transform ${DURATIONS.fast}ms ease`,
    ...(selected ? { transform: 'translateY(-2px)' } : null),
    ...(interactive ? {
      '&:hover:not(:disabled)': { transform: 'translateY(-1px)' },
      '&:active:not(:disabled)': { transform: 'translateY(1px) scale(0.94)' },
      '&:disabled': { cursor: 'default' },
      ...focusRingSx({ tone: UI_COLORS.accentText }),
    } : null),
    '@media (prefers-reduced-motion: reduce)': { transition: 'none', '&:hover, &:active': { transform: 'none' } },
  };
}

const svgSx = { width: '100%', height: '100%', display: 'block', overflow: 'visible' };

const MOTION_SX = Object.freeze({
  relit: {
    animation: `gbGemRelit ${GEM_MOTION.relit}ms cubic-bezier(.2, 1.6, .4, 1)`,
    '@keyframes gbGemRelit': {
      '0%': { transform: 'scale(0.55)' },
      '60%': { transform: 'scale(1.22)' },
      '100%': { transform: 'scale(1)' },
    },
    '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
  },
  spent: {
    animation: `gbGemSpent ${GEM_MOTION.spent}ms ease-out`,
    '@keyframes gbGemSpent': {
      '0%': { transform: 'scale(1)' },
      '35%': { transform: 'scale(0.82) rotate(-6deg)' },
      '70%': { transform: 'scale(1.04) rotate(3deg)' },
      '100%': { transform: 'scale(1)' },
    },
    '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
  },
});

function sparkSx(px, dx, dy, index) {
  const spark = Math.round(px * 0.45);
  return {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: spark,
    height: spark,
    ml: `${-spark / 2}px`,
    mt: `${-spark / 2}px`,
    pointerEvents: 'none',
    overflow: 'visible',
    '--gem-dx': `${dx * px}px`,
    '--gem-dy': `${dy * px}px`,
    animation: `gbGemSpark ${GEM_MOTION.spark}ms ease-out ${index * GEM_MOTION.sparkStagger}ms both`,
    '@keyframes gbGemSpark': {
      '0%': { transform: 'translate(0, 0) scale(0.3)', opacity: 1 },
      '100%': { transform: 'translate(var(--gem-dx), var(--gem-dy)) scale(1)', opacity: 0 },
    },
    '@media (prefers-reduced-motion: reduce)': { display: 'none' },
  };
}
