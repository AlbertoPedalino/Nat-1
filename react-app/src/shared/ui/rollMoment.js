import { OPACITY, UI_COLORS, uiMix } from './colors.js';
import { svgStylePicture } from './svgPicture.js';
import { MOMENT_BURST } from './shapes.js';
import { BUBBLE_MOTIONS, bubbleToneSx } from './bubble.js';
import { useStyleShapes } from './themeIds.js';
import { APPLE_WEBKIT_QUERY, PLAIN_LETTERING, inkLettering } from './shadows.js';
import { LETTER_SPACINGS } from './fonts.js';
import { seededRandom } from '../seededRandom.js';
import { crescentPoints, polygonPath, starCorners } from './handDrawing.js';

// A roll's moment: a natural 20 or a natural 1, each drawn as the style draws
// it (shapes.js `moments`): the `burst` behind the total that shouts, in a
// `fill` role and painted in a technique (`paint`), turned `turn` degrees;
// how the total is lettered on it (`number`); how the roll's bubble moves
// (`motion`, bubble.js BUBBLE_MOTIONS); and the particles round it
// (`effect`, momentParticles.js, drawn by RollMomentEffect.jsx). Every roll that shouts (the dice toast, a bubble
// over a piece on the map) takes its moment from here, so a style changes
// all of them at once, and a new look is data: a burst kind, a paint, a
// motion and an effect from the lists below, or one more entry in them.

export const MOMENTS = Object.freeze(['nat20', 'nat1']);

// A roll's moment from its toast layout (rollToastLayout.js); null for none.
export function rollMoment(layout) {
  if (layout?.isCrit) return 'nat20';
  if (layout?.isFail) return 'nat1';
  return null;
}

// ---- Burst kinds: each the outline of a shape, as points in a box `width`
// units wide (100 where the burst gives none) and 100 tall.

const radians = (degrees) => (degrees * Math.PI) / 180;
const polar = (width, squash) => (reach, angle) => [
  width / 2 + reach * Math.cos(radians(angle)),
  50 + reach * squash * Math.sin(radians(angle)),
];
// How far an angle is from another, round the circle, in degrees (0–180).
const apart = (angle, from) => Math.abs((((angle - from) % 360) + 540) % 360 - 180);

// An outline traced round the middle, its reach at each angle `reach(angle)`.
function traced(reach, { width = 100, squash = 1, steps = 240 } = {}) {
  const at = polar(width, squash);
  return Array.from({ length: steps }, (_, index) => {
    const angle = (index * 360) / steps;
    return at(reach(angle), angle);
  });
}

const BURSTS = Object.freeze({
  // The comic's KAPOW: sharp spikes of a few lengths each leaning a little
  // ([angle, reach, lean]), valleys of a few depths, squashed by `squash`.
  kapow: ({ width, squash, spikes, valleys }) => {
    const at = polar(width, squash);
    return spikes.flatMap(([angle, reach, lean], index) => {
      const next = spikes[(index + 1) % spikes.length][0] + (index === spikes.length - 1 ? 360 : 0);
      return [at(reach * 0.97, angle + lean), at(valleys[index] * 0.97, (angle + next) / 2)];
    });
  },
  // The comic's crash: arms of different reach ([angle, reach]), each kinked
  // along its trailing edge ([share of reach, degrees off]), round a `middle`.
  crash: ({ arms, kinks, middle }) => {
    const at = polar(100, 1);
    return arms.flatMap(([angle, reach], index) => {
      const next = arms[(index + 1) % arms.length][0] + (index === arms.length - 1 ? 360 : 0);
      return [at(reach, angle), ...kinks.map(([share, off]) => at(reach * share, angle + off)), at(middle, (angle + next) / 2)];
    });
  },
  // A star of `points` tips (`reach`, a number or one per tip), its notches at
  // `inner`, each tip leaning `lean` degrees, the first at `rotate` degrees.
  star: ({ width = 100, ...star }) => starCorners({ ...star, centre: [width / 2, 50] }),
  // Rounded lobes round a `base`: `count` of them `amp` units out, rounder
  // or sharper with `power` (a flower, a ship's wheel, a puff of cloud with
  // `scallop`); with `top`, only the upper half splashes and the lower is
  // flattened by `flat` (a splash).
  lobes: ({ base, amp, count, power = 1, scallop = false, top = false, flat = 1, width = 100, squash = 1 }) => traced((angle) => {
    const wave = scallop ? Math.abs(Math.sin(radians((angle * count) / 2))) : Math.max(0, Math.cos(radians(angle * count)));
    const up = top ? Math.max(0, -Math.sin(radians(angle))) : 1;
    const reach = base + amp * (wave ** power) * up;
    return top && Math.sin(radians(angle)) > 0 ? reach * flat : reach;
  }, { width, squash }),
  // A splat: a round `base` wobbled by `waves` ([how many, how far, turned]),
  // with `drips` running out of it and `notches` cut into it ([angle,
  // length or depth (a share), half-width in degrees]); `rough` jitters every
  // point (a rough-hewn stone), seeded by `seed`.
  splat: ({ base, waves = [], drips = [], notches = [], steps = 240, rough = 0, seed = 'splat', width = 100 }) => {
    const random = seededRandom(seed);
    return traced((angle) => {
      let reach = base + waves.reduce((sum, [count, amp, turn = 0]) => sum + amp * Math.sin(radians(angle * count + turn)), 0);
      drips.forEach(([at, length, wide]) => {
        const off = apart(angle, at);
        if (off < wide) reach += length * (1 - off / wide) ** 0.55;
      });
      notches.forEach(([at, depth, wide]) => {
        const off = apart(angle, at);
        if (off < wide) reach *= 1 - depth * (1 - off / wide);
      });
      return reach;
    }, { steps, width }).map(([x, y]) => [x + (random() - 0.5) * rough, y + (random() - 0.5) * rough]);
  },
  // A cog of `teeth` reaching `outer` from a rim at `inner`, some of them
  // `missing`, one of them `crack`ed into a wedge.
  gear: ({ teeth, outer, inner, missing = [], crack = null }) => {
    const at = polar(100, 1);
    const step = 360 / teeth;
    return Array.from({ length: teeth }, (_, index) => {
      const angle = -90 + index * step;
      if (index === crack) return [at(inner, angle - step * 0.3), at(inner * 0.35, angle), at(inner * 0.6, angle + step * 0.08), at(inner * 0.25, angle + step * 0.2), at(inner, angle + step * 0.3)];
      if (missing.includes(index)) return [at(inner, angle - step * 0.3), at(inner - 1, angle), at(inner, angle + step * 0.3)];
      return [at(inner, angle - step * 0.3), at(outer, angle - step * 0.18), at(outer, angle + step * 0.18), at(inner, angle + step * 0.3)];
    }).flat();
  },
  // A crescent: the circle `outer` ([x, y, r]) less the circle `bite`.
  crescent: ({ outer, bite }) => crescentPoints(outer, bite, 40),
  // An eye's almond, `width` across and `height` from lid to lid.
  lens: ({ width, height }) => {
    const lid = (side) => Array.from({ length: 41 }, (_, i) => {
      const x = (i / 40) * width;
      return [x, 50 + side * (height / 2) * Math.sin((Math.PI * i) / 40)];
    });
    return [...lid(-1), ...lid(1).reverse().slice(1, -1)];
  },
  // A virus: a round `body` studded with `spikes`, each `length` long and
  // capped with a knob `knob` across.
  virus: ({ body, spikes, length, knob }) => {
    const at = polar(100, 1);
    const step = 360 / spikes;
    const stem = knob * 0.18;
    return Array.from({ length: spikes }, (_, index) => {
      const angle = -90 + index * step;
      const cap = Array.from({ length: 9 }, (_, i) => {
        const turn = radians(angle - 90 + (i / 8) * 180);
        const [cx, cy] = at(body + length, angle);
        return [cx + Math.cos(turn) * knob, cy + Math.sin(turn) * knob];
      });
      return [at(body, angle - step / 2), at(body, angle - stem * 3), at(body + length - knob * 0.5, angle - stem * 1.5), ...cap, at(body + length - knob * 0.5, angle + stem * 1.5), at(body, angle + stem * 3)];
    }).flat();
  },
  // A polygon of `sides` corners at `reach`, each side notched: out to `edge`
  // a third of the way along, in to `depth` at its middle (a targeting hexagon).
  notched: ({ sides, reach, edge, depth, width = 100, squash = 1, rotate = -90 }) => {
    const at = polar(width, squash);
    const step = 360 / sides;
    return Array.from({ length: sides }, (_, index) => {
      const angle = rotate + index * step;
      return [at(reach, angle), at(edge, angle + step / 3), at(depth, angle + step / 2), at(edge, angle + (step * 2) / 3)];
    }).flat();
  },
  // Corners given by hand ([x, y]), in a box `width` wide.
  polygon: ({ points }) => points,
  // Another burst (`of`) set on a grid `grid` units square, stepping between
  // its corners: an 8-bit shape.
  stairs: ({ of, grid = 10 }) => {
    const snapped = burstPoints(of).map(([x, y]) => [Math.round(x / grid) * grid, Math.round(y / grid) * grid]);
    return snapped.flatMap(([x, y], index) => {
      const [nx, ny] = snapped[(index + 1) % snapped.length];
      return x !== nx && y !== ny ? [[x, y], [nx, y]] : [[x, y]];
    });
  },
});
export const BURST_KINDS = Object.freeze(Object.keys(BURSTS));

function burstPoints(burst) {
  return BURSTS[burst.kind](burst);
}

// A burst's outline as an SVG path, in its box.
export function burstPath(burst) {
  return polygonPath(burstPoints(burst));
}

// ---- Paints: each a technique the burst is drawn in, as the inside of an
// SVG `width` by 100 (`d` its path, `fill` its colour, `points` its
// corners), in the palette's roles (resolved per palette when drawn).

const { edge: EDGE, white: WHITE, black: BLACK } = UI_COLORS;
const INSET = 0.92;
const around = (width, share) => `transform="translate(${width / 2} 50) scale(${share}) translate(${-width / 2} -50)"`;
const glowFilter = (id, blur) => `<filter id="${id}" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="${blur}" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;
// The speckled edge of paint sprayed or stamped (war's stencil and stamp).
const SPRAY_FILTER = '<filter id="spray" x="-25%" y="-25%" width="150%" height="150%"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="1" seed="4" result="n"/><feGaussianBlur in="SourceGraphic" stdDeviation="1.8" result="b"/><feComposite in="b" in2="n" operator="arithmetic" k1="1.7" k2=".9" k3="-.95" k4="0" result="s"/><feComponentTransfer in="s"><feFuncA type="discrete" tableValues="0 0 .9 1 1"/></feComponentTransfer></filter>';

const PAINTS = Object.freeze({
  // The comic's: a flat colour under an even screen of Ben-Day dots a shade
  // darker, edged in a thick ink line.
  comic: ({ d, fill }) => {
    const dot = uiMix(fill, EDGE, 0.45);
    return `<defs><pattern id="dots" width="5" height="10" patternUnits="userSpaceOnUse"><g fill="${dot}"><circle cx="1.25" cy="2.5" r="1.25"/><circle cx="3.75" cy="7.5" r="1.25"/></g></pattern></defs>`
      + `<path d="${d}" fill="${fill}"/><path d="${d}" fill="url(#dots)"/>`
      + `<path d="${d}" fill="none" stroke="${EDGE}" stroke-width="3.4" stroke-linejoin="miter" stroke-miterlimit="6"/>`;
  },
  // The comic in pastel: a paler colour under large light dots, a rounder ink.
  pastel: ({ d, fill }) => {
    const dot = uiMix(fill, WHITE, 0.65);
    return `<defs><pattern id="dots" width="8" height="16" patternUnits="userSpaceOnUse"><g fill="${dot}"><circle cx="2" cy="4" r="2"/><circle cx="6" cy="12" r="2"/></g></pattern></defs>`
      + `<path d="${d}" fill="${uiMix(fill, WHITE, 0.25)}"/><path d="${d}" fill="url(#dots)"/>`
      + `<path d="${d}" fill="none" stroke="${EDGE}" stroke-width="3" stroke-linejoin="round"/>`;
  },
  // A woodcut: hatched one way, cross-hatched below, its edge chiselled.
  engraving: ({ d, fill, width }) => `<defs><pattern id="hatch" width="3.2" height="3.2" patternUnits="userSpaceOnUse" patternTransform="rotate(38)"><rect width="3.2" height="1.1" fill="${BLACK}" opacity=".6"/></pattern>`
    + `<pattern id="cross" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(-42)"><rect width="4" height=".9" fill="${BLACK}" opacity=".45"/></pattern>`
    + `<linearGradient id="lower" x1="0" y1="0" x2="0" y2="1"><stop offset=".45" stop-color="${WHITE}" stop-opacity="0"/><stop offset="1" stop-color="${WHITE}"/></linearGradient><mask id="below"><rect width="${width}" height="100" fill="url(#lower)"/></mask>`
    + '<filter id="chisel"><feTurbulence type="fractalNoise" baseFrequency=".09" numOctaves="2" seed="3"/><feDisplacementMap in="SourceGraphic" scale="3.5"/></filter></defs>'
    + `<g filter="url(#chisel)"><path d="${d}" fill="${fill}"/><path d="${d}" fill="url(#hatch)"/><path d="${d}" fill="url(#cross)" mask="url(#below)"/>`
    + `<path d="${d}" fill="none" stroke="${BLACK}" stroke-width="2.4"/><path d="${d}" fill="none" stroke="${BLACK}" stroke-width=".8" ${around(width, 0.84)}/></g>`,
  // A hologram: a faint fill, scanlines, a lit line and a dashed one inside.
  hologram: ({ d, fill, width }) => `<defs><pattern id="scan" width="4" height="3.4" patternUnits="userSpaceOnUse"><rect width="4" height="1.2" fill="${fill}" opacity=".55"/></pattern>${glowFilter('glow', 2)}</defs>`
    + `<path d="${d}" fill="${fill}" fill-opacity=".14"/><path d="${d}" fill="url(#scan)"/>`
    + `<path d="${d}" fill="none" stroke="${fill}" stroke-width="2" filter="url(#glow)"/>`
    + `<path d="${d}" fill="none" stroke="${WHITE}" stroke-opacity=".7" stroke-width=".7" stroke-dasharray="5 3" ${around(width, 0.8)}/>`,
  // Spray paint through a stencil: an overspray behind, a speckled edge, chips.
  stencil: ({ d, fill }) => `<defs>${SPRAY_FILTER}<filter id="mist" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="4"/></filter>`
    + `<pattern id="chips" width="22" height="22" patternUnits="userSpaceOnUse"><circle cx="6" cy="7" r="1.6" fill="${BLACK}" opacity=".35"/><circle cx="16" cy="15" r="1.1" fill="${BLACK}" opacity=".3"/></pattern></defs>`
    + `<path d="${d}" fill="${fill}" opacity=".35" filter="url(#mist)"/><g filter="url(#spray)"><path d="${d}" fill="${fill}"/></g><path d="${d}" fill="url(#chips)" filter="url(#spray)"/>`,
  // A rubber stamp: two lines of stamp ink round a bare paper and a star each
  // side of the number, the ink's edge speckled.
  stamp: ({ d, fill, width }) => {
    const star = (x) => `<path d="M${x} 42l2.4 5.2 5.6.5-4.3 3.7 1.3 5.5-5-3-5 3 1.3-5.5-4.3-3.7 5.6-.5z" fill="${fill}"/>`;
    return `<defs>${SPRAY_FILTER}</defs>`
      + `<path d="${d}" fill="${fill}" opacity=".1"/>`
      + `<g filter="url(#spray)"><path d="${d}" fill="none" stroke="${fill}" stroke-width="5"/><path d="${d}" fill="none" stroke="${fill}" stroke-width="2" ${around(width, 0.82)}/>${star(width * 0.16)}${star(width * 0.84)}</g>`;
  },
  // Starlight: white at its heart fading out to nothing, a halo, a few stars.
  starlight: ({ d, fill, width }) => {
    const random = seededRandom(`stars:${width}`);
    const stars = Array.from({ length: 9 }, () => `<circle cx="${(width * (0.2 + random() * 0.6)).toFixed(1)}" cy="${(20 + random() * 60).toFixed(1)}" r="${(0.5 + random()).toFixed(2)}" fill="${WHITE}" opacity=".9"/>`).join('');
    return `<defs><radialGradient id="light" cx="50%" cy="50%" r="58%"><stop offset="0" stop-color="${WHITE}"/><stop offset=".32" stop-color="${uiMix(fill, WHITE, 0.5)}"/><stop offset=".75" stop-color="${fill}" stop-opacity=".75"/><stop offset="1" stop-color="${fill}" stop-opacity="0"/></radialGradient>${glowFilter('glow', 3.5)}</defs>`
      + `<path d="${d}" fill="url(#light)" filter="url(#glow)"/><path d="${d}" fill="none" stroke="${WHITE}" stroke-opacity=".55" stroke-width=".6"/>${stars}`;
  },
  // A sea chart: stained paper, a pen's wavering line, a dashed border inside.
  chart: ({ d, fill, width }) => {
    const ink = UI_COLORS.onPaper;
    return '<defs><filter id="stain"><feTurbulence type="fractalNoise" baseFrequency=".035" numOctaves="3" seed="8"/><feColorMatrix values="0 0 0 0 .42  0 0 0 0 .26  0 0 0 0 .1  0 0 0 .9 -.25"/><feComposite in2="SourceGraphic" operator="in"/></filter>'
      + '<filter id="pen"><feTurbulence type="fractalNoise" baseFrequency=".12" numOctaves="1" seed="2"/><feDisplacementMap in="SourceGraphic" scale="2.2"/></filter></defs>'
      + `<path d="${d}" fill="${uiMix(fill, UI_COLORS.paper, 0.62)}"/><path d="${d}" fill="${BLACK}" filter="url(#stain)"/>`
      + `<g filter="url(#pen)"><path d="${d}" fill="none" stroke="${ink}" stroke-width="2"/><path d="${d}" fill="none" stroke="${ink}" stroke-width=".8" stroke-dasharray="2.5 2" ${around(width, 0.84)}/></g>`;
  },
  // Polished brass: bands of light across it, a bevel, rivets round it.
  brass: ({ d, fill, width, points }) => {
    const dark = uiMix(fill, BLACK, 0.5);
    const shine = uiMix(fill, WHITE, 0.65);
    const every = Math.max(1, Math.round(points.length / 10));
    const rivets = points.filter((_, index) => index % every === 0).map(([x, y]) => `<circle cx="${(width / 2 + (x - width / 2) * 0.82).toFixed(1)}" cy="${(50 + (y - 50) * 0.82).toFixed(1)}" r="1.9" fill="${shine}" stroke="${dark}" stroke-width=".7"/>`).join('');
    return `<defs><linearGradient id="brass" x1="0" y1="0" x2=".35" y2="1"><stop offset="0" stop-color="${shine}"/><stop offset=".28" stop-color="${fill}"/><stop offset=".55" stop-color="${dark}"/><stop offset=".78" stop-color="${fill}"/><stop offset="1" stop-color="${shine}"/></linearGradient></defs>`
      + `<path d="${d}" fill="url(#brass)" stroke="${uiMix(fill, BLACK, 0.8)}" stroke-width="2.4" stroke-linejoin="round"/>`
      + `<path d="${d}" fill="none" stroke="${shine}" stroke-opacity=".7" stroke-width="1.1" ${around(width, 0.9)}/>${rivets}`;
  },
  // Molten metal: white-hot at the heart, veined with cooling crust, glowing.
  molten: ({ d, fill }) => `<defs><radialGradient id="heat" cx="50%" cy="55%" r="60%"><stop offset="0" stop-color="${uiMix(UI_COLORS.accentHighlight, WHITE, 0.6)}"/><stop offset=".3" stop-color="${UI_COLORS.warning}"/><stop offset=".65" stop-color="${fill}"/><stop offset="1" stop-color="${uiMix(fill, BLACK, 0.55)}"/></radialGradient>`
    + `<filter id="crust"><feTurbulence type="turbulence" baseFrequency=".07" numOctaves="2" seed="11"/><feColorMatrix values="0 0 0 0 .1  0 0 0 0 .03  0 0 0 0 0  0 0 0 -4 1.25"/><feComposite in2="SourceGraphic" operator="in"/></filter>${glowFilter('glow', 4)}</defs>`
    + `<path d="${d}" fill="${fill}" filter="url(#glow)" opacity=".8"/><path d="${d}" fill="url(#heat)"/><path d="${d}" fill="${BLACK}" filter="url(#crust)"/>`
    + `<path d="${d}" fill="none" stroke="${EDGE}" stroke-width="2"/>`,
  // Raw stone: grey, speckled, tinged with the fill.
  stone: ({ d, fill }) => `<defs><linearGradient id="rock" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${UI_COLORS.textFaint}"/><stop offset=".6" stop-color="${UI_COLORS.outline}"/><stop offset="1" stop-color="${UI_COLORS.surfaceRaised}"/></linearGradient>`
    + `<filter id="grit"><feTurbulence type="fractalNoise" baseFrequency=".6" numOctaves="2" seed="6"/><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1.4 -.6"/><feComposite in2="SourceGraphic" operator="in"/></filter></defs>`
    + `<path d="${d}" fill="url(#rock)"/><path d="${d}" fill="${BLACK}" filter="url(#grit)"/><path d="${d}" fill="${fill}" opacity=".28"/>`
    + `<path d="${d}" fill="none" stroke="${EDGE}" stroke-width="2.6" stroke-linejoin="bevel"/>`,
  // Watercolour: two washes a little apart, the pigment pooling at the edge.
  watercolor: ({ d, fill }) => '<defs><filter id="wash" x="-25%" y="-25%" width="150%" height="150%"><feTurbulence type="fractalNoise" baseFrequency=".045" numOctaves="3" seed="2" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="9" result="d"/><feGaussianBlur in="d" stdDeviation="1.1"/></filter>'
    + '<filter id="pool" x="-25%" y="-25%" width="150%" height="150%"><feTurbulence type="fractalNoise" baseFrequency=".05" numOctaves="2" seed="9" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="7"/></filter></defs>'
    + `<path d="${d}" fill="${UI_COLORS.spell}" opacity=".45" filter="url(#wash)" transform="translate(4 -3)"/><path d="${d}" fill="${fill}" opacity=".62" filter="url(#wash)"/>`
    + `<path d="${d}" fill="none" stroke="${uiMix(fill, BLACK, 0.35)}" stroke-width="2.2" opacity=".55" filter="url(#pool)"/>`,
  // Ink bleeding into wet paper, a sickly glow round it.
  inkbleed: ({ d, fill, width }) => `<defs><filter id="bleed" x="-25%" y="-25%" width="150%" height="150%"><feTurbulence type="fractalNoise" baseFrequency=".035" numOctaves="3" seed="5" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="11"/><feGaussianBlur stdDeviation=".5"/></filter>${glowFilter('glow', 4)}</defs>`
    + `<path d="${d}" fill="none" stroke="${fill}" stroke-width="5" opacity=".7" filter="url(#glow)"/>`
    + `<g filter="url(#bleed)"><path d="${d}" fill="${UI_COLORS.surfaceDarkest}"/><path d="${d}" fill="${fill}" opacity=".22" ${around(width, 0.7)}/></g>`
    + `<path d="${d}" fill="none" stroke="${fill}" stroke-width=".9" opacity=".6" ${around(width, 0.9)}/>`,
  // Hard pixels: a checker dither, a block shadow, a square ink.
  pixel: ({ d, fill }) => {
    const dark = uiMix(fill, BLACK, 0.35);
    return `<defs><pattern id="dither" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="2" height="2" fill="${dark}"/><rect x="2" y="2" width="2" height="2" fill="${dark}"/></pattern></defs>`
      + `<g shape-rendering="crispEdges"><path d="${d}" fill="${EDGE}" transform="translate(5 5)"/><path d="${d}" fill="${fill}"/><path d="${d}" fill="url(#dither)" opacity=".45"/>`
      + `<path d="${d}" fill="none" stroke="${EDGE}" stroke-width="3.5" stroke-linejoin="miter"/></g>`;
  },
  // Neon tubing on dark glass, split into the secondary and the info colours.
  neon: ({ d, fill }) => `<defs>${glowFilter('glow', 2.4)}</defs>`
    + `<path d="${d}" fill="${BLACK}" fill-opacity=".6"/>`
    + `<path d="${d}" fill="none" stroke="${UI_COLORS.secondary}" stroke-width="1.6" opacity=".85" transform="translate(-2.5 .5)"/>`
    + `<path d="${d}" fill="none" stroke="${UI_COLORS.info}" stroke-width="1.6" opacity=".85" transform="translate(2.5 -.5)"/>`
    + `<path d="${d}" fill="none" stroke="${fill}" stroke-width="2.6" filter="url(#glow)"/><path d="${d}" fill="none" stroke="${WHITE}" stroke-width=".7" opacity=".8"/>`,
});
export const BURST_PAINTS = Object.freeze(Object.keys(PAINTS));


// A moment's burst as a whole SVG: its shape, painted in its technique, a
// little inside its box so nothing is cut off.
export function burstSvg({ burst, paint, fill }) {
  const width = burst.width ?? 100;
  const inside = PAINTS[paint]({ d: burstPath(burst), fill: UI_COLORS[fill], width, points: burstPoints(burst) });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} 100"><g ${around(width, INSET)}>${inside}</g></svg>`;
}

// The total of a roll with a `moment`, set on its burst: the style's shape in
// its technique and colour (one picture per style and palette), as wide as
// its aspect and turned as the style turns it.
export function momentBurstSx(moment) {
  const picture = svgStylePicture(`burst:${moment}`, ({ moments }) => burstSvg(moments[moment]));
  return {
    position: 'relative',
    isolation: 'isolate',
    display: 'inline-block',
    px: 1.5,
    '&::before': {
      content: '""',
      position: 'absolute',
      left: '50%',
      top: '50%',
      width: `calc(2.2em * ${MOMENT_BURST[moment].aspect})`,
      height: '2.2em',
      transform: `translate(-50%, -50%) rotate(${MOMENT_BURST[moment].turn})`,
      backgroundImage: picture,
      backgroundSize: '100% 100%',
      zIndex: -1,
    },
  };
}

// ---- How the total is lettered on its burst (`number`), in the moment's
// `fill` where it lights or stamps it. `ink` keeps the shouting lettering.

const lettered = (textShadow, rest = {}) => ({
  ...PLAIN_LETTERING,
  ...rest,
  textShadow,
  [APPLE_WEBKIT_QUERY]: { textShadow, filter: 'none' },
});

const NUMBER_LOOKS = Object.freeze({
  ink: () => ({}),
  // Lit from within (a hologram, a neon, starlight, molten metal).
  glow: (fill) => lettered(`0 0 4px ${fill}, 0 0 12px ${fill}, 0 0 22px ${fill}`, { color: WHITE }),
  flat: () => lettered(`4px 4px 0 ${EDGE}`),
  // Cut in: a thin ink and a short shadow (a woodcut, a chart, a stone).
  engrave: () => ({ ...inkLettering(1, 1), color: UI_COLORS.textPrimary }),
  // In the stamp's own ink, a little worn.
  stamp: (fill) => lettered('none', { color: fill, opacity: OPACITY.solid }),
  stencil: () => lettered(`1px 1px 3px ${EDGE}`, { color: UI_COLORS.textPrimary, letterSpacing: LETTER_SPACINGS.sm }),
  soft: () => lettered(`0 2px 8px ${EDGE}, 1px 1px 2px ${EDGE}`, { color: WHITE }),
  // Struck in the metal: pale, its ink the metal's dark.
  emboss: (fill) => ({ ...inkLettering(1, 2, uiMix(fill, BLACK, 0.8)), color: uiMix(fill, WHITE, 0.7) }),
});
export const NUMBER_LOOK_KINDS = Object.freeze(Object.keys(NUMBER_LOOKS));

// What a moment says and in which colours, the same in every style and on
// every screen (the dice toast, a roll bubble, the roll log): its words, the
// colour they are written in, and the colour and depth of the solid shadow
// its bubble throws.
export const MOMENT_WORDS = Object.freeze({
  nat20: Object.freeze({ label: 'NATURAL 20!', text: 'accentText', shadow: 'accent', drop: 4 }),
  nat1: Object.freeze({ label: 'NATURAL 1', text: 'danger', shadow: 'danger', drop: 3 }),
});

// A roll's moment as the chosen style draws it: how its bubble moves,
// settling at `rest` (the dice toast's shouting tilt, the map bubble's own),
// and the shadow it throws; how its total is lettered; and what it says, in
// which colour. Null for no moment.
export function useRollMoment(moment, rest) {
  const { moments } = useStyleShapes();
  if (!moment) return null;
  const { motion, number, fill } = moments[moment];
  const { label, text, shadow, drop } = MOMENT_WORDS[moment];
  return {
    bubbleSx: { ...bubbleToneSx(UI_COLORS[shadow], drop), ...BUBBLE_MOTIONS[motion](rest) },
    numberSx: NUMBER_LOOKS[number](UI_COLORS[fill]),
    label,
    labelColor: UI_COLORS[text],
  };
}
