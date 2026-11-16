import { useEffect, useRef, useState } from 'react';
import { Box } from '@mui/material';
import { UI_COLORS, uiAlpha, uiDarken, uiLighten, OPACITY } from './colors.js';
import { GEM_TONES, TRAINING_TONES } from './entityColors.js';
import { focusRingSx } from './interactive.js';
import { DURATIONS, GEM_MOTION, motionTime, motionShift, motionSquash } from './motion.js';
import { PARTICLE_GLYPHS } from './momentParticles.js';
import { useStyleId } from './themeIds.js';
import { styleShapes } from './shapes.js';

// Every counter of the sheet that is spent and recovered one at a time — a
// spell slot, a pact slot, a feature's uses, a free cast, a hit die — is a
// row of gems: a lit, faceted gem while it is there to spend, its empty
// setting once it is spent. Drawn in the app's comic hand: an inked outline,
// flat cel-shaded facets lit from the top left, a white glint and the solid
// shadow under it every pressable thing has. A gem relit pops with a few
// sparkles; one spent sinks with a wobble (none for reduced motion).
//
// The colours live in entityColors.js (GEM_TONES), the sizes here (GEM_SIZES), the cuts
// in the style's shapes (shapes.js gemCuts): a new look for every gem is a
// change to those two files. A skill's or a save's training mark is a gem of its own cut, still
// (TrainingGem).
//
// - `available`: lit (there to spend) or an empty setting (spent).
// - `kind`: what it counts, which sets its colour (GEM_TONES).
// - `size`: 'md' in a panel of its own, 'sm' inside a card's row.
// - `selected`: ringed in the accent, lifted (a hit die chosen to spend).
// - `onClick` makes it a button; without one it only shows.
// Other props (aria-label, title, disabled…) go to the element.

// The cuts are the style's (shapes.js gemCuts): a slot's or a hit die's
// counter, a feature's uses, a training mark. The comic style's hexagons (the
// counter and the uses told apart by colour) and four-sided diamond; the
// gothic one's drops of blood, candles and crosses; the war one's cartridges,
// grenades and chevrons; the sci-fi one's power cells; and every other
// style's own (stars and moons, doubloons, gears, rune stones, flowers, eyes,
// pixel coins). A cut may colour a
// kind its own way (`tones`, over GEM_TONES). Drawn here from them.

// Sizes easy to hit with a finger: 'md' in a panel of its own, 'sm' inside a
// card's row.
export const GEM_SIZES = Object.freeze({ md: 26, sm: 22 });

// A regular cut of `sides`, its first point at the top.
function polygon(sides, cx, cy, rx, ry) {
  return Array.from({ length: sides }, (_, i) => {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / sides;
    return [cx + rx * Math.cos(angle), cy + ry * Math.sin(angle)];
  });
}

const points = (list) => list.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
const pathOf = (list) => `M${points(list)}Z`;

// A cut's drawing worked out once (a gemCuts entry): its colours by kind
// (`tones`, palette roles resolved), its outline, its parts
// in their shades (`parts`: facets, or a drawn token's shading), its table,
// whether the comic glint shines on it, its solid shadow and the rim of its
// empty setting, all as SVG paths. A cut gem (`sides`, outline and table as
// centre and radii): light from the top left, a facet facing it lit, one
// facing away in shade, the others in the gem's own colour. A drawn token
// (`outline`, `shading`) brings its parts drawn.
function gemCut(cut) {
  const tones = Object.fromEntries(Object.entries(cut.tones || {}).map(([kind, role]) => [kind, UI_COLORS[role]]));
  return Object.freeze({ tones, ...(cut.outline ? drawnCut(cut) : cutGem(cut)) });
}

function cutGem(cut) {
  const { sides, outer: outerAt, inner: innerAt, shadowDrop } = cut;
  const outer = polygon(sides, ...outerAt);
  const inner = polygon(sides, ...innerAt);
  const parts = outer.map((from, i) => {
    const to = outer[(i + 1) % sides];
    const shape = pathOf([from, to, inner[(i + 1) % sides], inner[i]]);
    const mx = (from[0] + to[0]) / 2 - 50;
    const my = (from[1] + to[1]) / 2 - 46;
    const facing = (mx * -0.6 + my * -0.8) / Math.hypot(mx, my);
    return { shape, shade: facing > 0.35 ? 'light' : facing < -0.35 ? 'dark' : 'base' };
  });
  return {
    parts,
    table: pathOf(inner),
    glint: true,
    outer: pathOf(outer),
    shadow: pathOf(outer.map(([x, y]) => [x, y + shadowDrop])),
    settingRim: pathOf(outer.map(([x, y]) => [50 + (x - 50) * 0.78, 46 + (y - 46) * 0.78 + 3])),
  };
}

function drawnCut({ outline, shading, glint, centre: [cx, cy], shadowDrop }) {
  // The shadow dropped and the setting's rim shrunk towards the centre.
  const shadowShift = `translate(0 ${shadowDrop})`;
  const settingRimShift = `translate(${cx} ${cy + 3}) scale(0.78) translate(${-cx} ${-cy})`;
  return {
    parts: shading.map(([shade, shape]) => ({ shape, shade })),
    table: null,
    glint,
    outer: outline,
    shadow: outline,
    shadowShift,
    settingRim: outline,
    settingRimShift,
  };
}

// A style's cuts, worked out once per style.
const CUTS = new Map();
function useGemCuts() {
  const styleId = useStyleId();
  if (!CUTS.has(styleId)) {
    const { gemCuts } = styleShapes(styleId);
    CUTS.set(styleId, Object.fromEntries(Object.entries(gemCuts).map(([name, cut]) => [name, gemCut(cut)])));
  }
  return CUTS.get(styleId);
}

// A tone's flat shades, worked out once.
const shadesCache = new Map();
function shadesOf(tone) {
  if (!shadesCache.has(tone)) {
    shadesCache.set(tone, {
      light: uiLighten(tone, 0.38),
      base: tone,
      dark: uiDarken(tone, 0.42),
      table: uiLighten(tone, 0.18),
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
  const cuts = useGemCuts();
  // A feature's uses take the uses' cut, every other counter the counter's.
  const cut = kind === 'uses' ? cuts.uses : cuts.counter;
  const shades = shadesOf(cut.tones[kind] || GEM_TONES[kind] || GEM_TONES.slot);
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
        {available ? <LitGem cut={cut} shades={shades} /> : <GemSetting cut={cut} shades={shades} />}
        <GemOutline cut={cut} selected={selected} width={outline} />
      </Box>
      {motion.state === 'relit' ? SPARKS.map(([dx, dy], index) => (
        <Box
          key={index}
          component="svg"
          viewBox="0 0 24 24"
          aria-hidden
          sx={sparkSx(px, dx, dy, index)}
        >
          <path d={PARTICLE_GLYPHS.sparkle.d} fill={UI_COLORS.accentHighlight} stroke={UI_COLORS.edge} strokeWidth={2.2} strokeLinejoin="round" />
        </Box>
      )) : null}
    </Box>
  );
}

// A training mark (a skill's or a save's proficiency): a gem of the four-sided
// cut, small and still, as it is read and never spent: an empty setting
// untrained, half lit for half proficiency, lit in its tone when proficient
// or expert (TRAINING_TONES). `training`: 'none', 'half', 'prof' or 'exp'.
export function TrainingGem({ training = 'none', size = TRAINING_GEM_SIZE, sx }) {
  const shades = shadesOf(TRAINING_TONES[training] || TRAINING_TONES.prof);
  const { training: cut } = useGemCuts();
  return (
    <Box component="svg" viewBox="0 0 100 100" aria-hidden sx={[trainingGemSx(size), sx]}>
      {training === 'prof' || training === 'exp'
        ? <LitGem cut={cut} shades={shades} />
        : <GemSetting cut={cut} shades={shades} />}
      {training === 'half' ? <Box component="g" sx={HALF_LIT_SX}><LitGem cut={cut} shades={shades} /></Box> : null}
      <GemOutline cut={cut} width={1.6} />
    </Box>
  );
}

export const TRAINING_GEM_SIZE = 14;

// A gem's drawing, for either cut: lit (its parts in their shades over its
// own colour, table, glint and its solid shadow), its empty setting, its
// outline.
function LitGem({ cut, shades }) {
  return (
    <>
      <path d={cut.shadow} transform={cut.shadowShift} fill={UI_COLORS.edge} />
      {cut.table ? null : <path d={cut.outer} fill={shades.base} />}
      {cut.parts.map((part) => (
        <path key={part.shape} d={part.shape} fill={shades[part.shade]} {...FACET_LINE} />
      ))}
      {cut.table ? <path d={cut.table} fill={shades.table} {...FACET_LINE} /> : null}
      {cut.glint ? (
        <>
          <path d="M34 30 l12 -7 l3 5 l-12 7 z" fill={UI_COLORS.white} />
          <circle cx="62" cy="25" r="3.4" fill={UI_COLORS.white} opacity={0.85} />
        </>
      ) : null}
    </>
  );
}

function GemSetting({ cut, shades }) {
  return (
    <>
      <path d={cut.outer} fill={UI_COLORS.surfaceSunken} />
      <path d={cut.settingRim} transform={cut.settingRimShift} fill="none" stroke={shades.rim} strokeWidth={1.3} vectorEffect="non-scaling-stroke" />
    </>
  );
}

function GemOutline({ cut, selected = false, width }) {
  return (
    <path
      d={cut.outer}
      fill="none"
      stroke={selected ? UI_COLORS.accent : UI_COLORS.edge}
      strokeWidth={selected ? width + 0.6 : width}
      strokeLinejoin="round"
      vectorEffect="non-scaling-stroke"
    />
  );
}

// Half proficiency: the gem's left half lit, over its setting.
const HALF_LIT_SX = { clipPath: 'inset(0 50% 0 0)' };

function trainingGemSx(size) {
  return { width: size, height: size, display: 'block', flexShrink: 0, overflow: 'visible' };
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
    transition: `transform ${motionTime(DURATIONS.fast)} ease`,
    ...(selected ? { transform: motionShift(0, -2) } : null),
    ...(interactive ? {
      '&:hover:not(:disabled)': { transform: motionShift(0, -1) },
      '&:active:not(:disabled)': { transform: `${motionShift(0, 1)} ${motionSquash(0.06)}` },
      '&:disabled': { cursor: 'default' },
      ...focusRingSx({ tone: UI_COLORS.accentText }),
    } : null),
    '@media (prefers-reduced-motion: reduce)': { transition: 'none', '&:hover, &:active': { transform: 'none' } },
  };
}

const svgSx = { width: '100%', height: '100%', display: 'block', overflow: 'visible' };

const MOTION_SX = Object.freeze({
  relit: {
    animation: `gbGemRelit ${motionTime(GEM_MOTION.relit)} cubic-bezier(.2, 1.6, .4, 1)`,
    '@keyframes gbGemRelit': {
      '0%': { transform: 'scale(0.55)' },
      '60%': { transform: 'scale(1.22)' },
      '100%': { transform: 'scale(1)' },
    },
    '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
  },
  spent: {
    animation: `gbGemSpent ${motionTime(GEM_MOTION.spent)} ease-out`,
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
    animation: `gbGemSpark ${motionTime(GEM_MOTION.spark)} ease-out ${motionTime(index * GEM_MOTION.sparkStagger)} both`,
    '@keyframes gbGemSpark': {
      '0%': { transform: 'translate(0, 0) scale(0.3)', opacity: 1 },
      '100%': { transform: 'translate(var(--gem-dx), var(--gem-dy)) scale(1)', opacity: 0 },
    },
    '@media (prefers-reduced-motion: reduce)': { display: 'none' },
  };
}
