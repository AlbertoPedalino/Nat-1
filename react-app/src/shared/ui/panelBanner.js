import { OPACITY } from './colors.js';
import { seededRandom } from '../seededRandom.js';
import { styleShapes } from './shapes.js';
import { crescentPoints, drawingCache, polygonPath, sketch } from './handDrawing.js';

// A panel's title bar drawn as the style draws it (shapes.js panel.banner): a
// ribbon, a scroll, a nameplate, a slab… with the title lettered on it, drawn
// by PanelBanner.jsx behind what the bar holds. Each is worked out here as
// pieces (handDrawing.js) across the bar's width, so it stretches with the
// panel; how its title is lettered on it is BANNER_TITLES'. A banner is a
// band across the bar, not a wall: its large fills are the palette's quieter
// roles (accentMuted, paperShade…), its details few, its shadow cast under
// it (castShadow).

// Every banner is drawn in a band BANNER_HEIGHT px high, set in by
// BANNER_INSET px from each end of the bar; one that reaches past the panel
// (BANNER_REACH, its ends out over the frame) is set in that much less.
export const BANNER_HEIGHT = 54;
export const BANNER_INSET = 18;

// A style's screentone (shapes.js surface.screentone: `line` px of every `gap`
// px, at `angle` degrees as a CSS gradient's) as stripes across a shape
// (`clip`), in `role`, as strong as `opacity`.
function stripes(clip, width, role, { line, gap, angle }, opacity) {
  const turn = (angle * Math.PI) / 180;
  const [gx, gy] = [Math.sin(turn), -Math.cos(turn)];
  const [sx, sy] = [-gy, gx];
  const reach = width + BANNER_HEIGHT;
  const [cx, cy] = [width / 2, BANNER_HEIGHT / 2];
  const lines = [];
  for (let k = -Math.ceil(reach / gap); k <= Math.ceil(reach / gap); k += 1) {
    const [px, py] = [cx + gx * k * gap, cy + gy * k * gap];
    lines.push({ tag: 'line', x1: px - sx * reach, y1: py - sy * reach, x2: px + sx * reach, y2: py + sy * reach, stroke: role, strokeWidth: line });
  }
  return { tag: 'g', clip, opacity, children: lines };
}

// A lit banner's shadow: soft, straight under its shape (its path `d`), what
// lifts it off the panel where no ink does.
const softShadow = (d) => ({ tag: 'path', d, fill: 'black', blur: 3, opacity: OPACITY.strong, transform: 'translate(0 3)' });

// A head of metal catching the light (a rivet, a nail): a round of `fill`
// `r` px across at (cx, cy), a glint off its near shoulder.
const stud = (cx, cy, r, fill) => [
  { tag: 'circle', cx, cy, r, fill },
  { tag: 'circle', cx: cx - r * 0.3, cy: cy - r * 0.3, r: r * 0.35, fill: 'white', opacity: OPACITY.strong },
];

// A light caught along something round or wet: a pale streak `width` by
// `height` at (x, y).
const glint = (x, y, width, height, opacity = OPACITY.line) => ({ tag: 'rect', x, y, width, height, rx: Math.min(width, height) / 2, fill: 'white', opacity });

// A banner's shadow, cast a little down and right under its shape (its
// `points`): what lifts it off the panel.
const castShadow = (points) => ({ tag: 'path', d: polygonPath(points.map(([x, y]) => [x + 2, y + 3])), fill: 'edge', opacity: OPACITY.edge });

// The comic's ribbon: the swallowtail, flat and unfolded. One band in a deep
// magenta, laid a little askew (its left end RIBBON_TILT px higher than its
// right, whatever its width), each end cut into a swallowtail a little past
// the panel's sides, inked, its style's screentone across it in ink, a gold
// thread along each edge.
const RIBBON_TILT = 4;
function ribbon(w, shapes) {
  const askew = ([x, y]) => [x, y + RIBBON_TILT * (x / w - 0.5)];
  const points = [[-12, 9], [w + 12, 9], [w + 2, 25], [w + 12, 41], [-12, 41], [-2, 25]].map(askew);
  const band = polygonPath(points);
  const thread = (y) => { const [[x1, y1], [x2, y2]] = [[-14, y], [w + 14, y]].map(askew); return `M${x1} ${y1} L${x2} ${y2}`; };
  return [
    castShadow(points),
    ...sketch('path', band, { seed: 5, roughness: 0.3, fill: 'dangerDeep', fillStyle: 'solid' }),
    stripes(band, w, 'edge', shapes.surface.screentone, OPACITY.shade),
    { tag: 'g', clip: band, children: [{ tag: 'path', d: `${thread(13.5)} ${thread(36.5)}`, fill: 'none', stroke: 'accent', strokeWidth: 1.6 }] },
    ...sketch('path', band, { seed: 6, roughness: 0.3, stroke: 'edge', strokeWidth: 2.6 }),
  ];
}

// Pirate: a chart laid out flat, all but unrolled: each end still turned
// over in one small curl, as a scroll's is drawn. The sheet's edges waved and
// torn a little (as its width seeds them), lifting where they run into a
// curl, stained, creased where it was folded, lit along its middle, a
// neatline ruled along it; where the bar has room, a course dashed across it
// to a red cross, and a seal of red wax. A curl is the sheet's end rolled
// once: a slim cylinder shaded from side to side, and on its top the roll's
// open end, the paper's edge turning in round the dark inside of it.
const PARCHMENT = Object.freeze({ shade: [[0, 'paper'], [1, 'paperShade']] });
const WAX = Object.freeze({ shade: [[0, 'danger'], [1, 'dangerDeep']] });
function scroll(w) {
  const random = seededRandom(`banner-scroll-${Math.round(w)}`);
  // An edge of the sheet, from one roll to the other: `rest` where it lies
  // flat, `flare` px further out where it meets a roll.
  const edge = (rest, flare, from, to) => {
    const count = Math.max(4, Math.round(Math.abs(to - from) / 12));
    return Array.from({ length: count + 1 }, (_, i) => {
      const u = i / count;
      const tear = i === 0 || i === count ? 0 : (random() - 0.5) * 1.4;
      return [from + (to - from) * u, rest + flare * (2 * u - 1) ** 4 + Math.sin(u * Math.PI * 3) * 0.7 + tear];
    });
  };
  const sheet = polygonPath([...edge(13.5, -3, 8, w - 8), ...edge(40.5, 3, w - 8, 8)]);
  const stains = Array.from({ length: Math.max(2, Math.round(w / 110)) }, () => ({
    tag: 'ellipse', cx: 34 + random() * (w - 68), cy: 17 + random() * 20, rx: 10 + random() * 18, ry: 4 + random() * 7, fill: 'accentMuted', blur: 4, opacity: OPACITY.shade,
  }));
  const creases = [0.34, 0.67].flatMap((u) => [
    { tag: 'rect', x: w * u, y: 8, width: 1, height: 38, fill: 'onPaper', opacity: OPACITY.fill },
    { tag: 'rect', x: w * u + 1, y: 8, width: 1, height: 38, fill: 'white', opacity: OPACITY.shade },
  ]);
  // The course and its cross, and the seal, past the title.
  const [from, to] = [w * 0.56, w - 66];
  const charted = w > 300 ? [
    { tag: 'path', d: `M${from} 34 Q${(from + to) / 2 - 10} 19 ${(from + to) / 2} 27 T${to - 5} 30`, fill: 'none', stroke: 'onPaper', strokeWidth: 0.9, strokeDasharray: '3 2.6', opacity: OPACITY.strong },
    { tag: 'path', d: `M${to - 3} 27 l6 6 m0 -6 l-6 6`, fill: 'none', stroke: 'dangerDeep', strokeWidth: 1.5 },
  ] : [];
  const sealed = w > 260 ? [
    { tag: 'circle', cx: w - 34, cy: 39.5, r: 6.6, fill: 'black', blur: 2, opacity: OPACITY.strong },
    { tag: 'circle', cx: w - 34, cy: 37.5, r: 6.2, fill: WAX },
    { tag: 'circle', cx: w - 34, cy: 37.5, r: 3.6, fill: 'none', stroke: 'dangerDeep', strokeWidth: 1.1 },
    { tag: 'circle', cx: w - 36, cy: 35.4, r: 1.4, fill: 'white', opacity: OPACITY.line },
  ] : [];
  // An end's curl about `cx`, `side` 1 at the left and -1 at the right (the
  // side its sheet leaves it on).
  const CURL = 6;
  const curl = (cx, side) => {
    const body = `M${cx - CURL} 12 a${CURL} 3 0 0 1 ${CURL * 2} 0 V42.5 a${CURL} 3.4 0 0 1 ${-CURL * 2} 0 Z`;
    return [
      // Its shadow on the sheet it stands on.
      { tag: 'rect', x: cx + side * 2 - 7, y: 11, width: 14, height: 33, fill: 'black', blur: 3.5, opacity: OPACITY.strong },
      { tag: 'path', d: body, fill: 'paper' },
      {
        tag: 'g',
        clip: body,
        children: [
          // Round: dark down both sides, more on the side turned from the light.
          { tag: 'rect', x: cx - CURL - 2, y: 6, width: 5, height: 44, fill: 'onPaper', blur: 2, opacity: OPACITY.edge },
          { tag: 'rect', x: cx + CURL - 3.5, y: 6, width: 6, height: 44, fill: 'onPaper', blur: 2, opacity: OPACITY.strong },
          glint(cx - 2.6, 14, 2, 27, OPACITY.strong),
          // Where the sheet's edge lies along the roll.
          { tag: 'rect', x: cx + side * 2.6 - 0.3, y: 12, width: 0.7, height: 34, fill: 'onPaper', opacity: OPACITY.line },
        ],
      },
      // Its open end: the dark inside, deeper at its heart, the paper's edge
      // turning in round it.
      { tag: 'ellipse', cx, cy: 12, rx: CURL, ry: 3, fill: 'accentMuted' },
      { tag: 'ellipse', cx: cx - side * 0.6, cy: 12.3, rx: CURL * 0.5, ry: 1.5, fill: 'onPaper', opacity: OPACITY.strong },
      { tag: 'ellipse', cx, cy: 12, rx: CURL, ry: 3, fill: 'none', stroke: 'paper', strokeWidth: 1.1 },
      { tag: 'path', d: `M${cx + side * CURL} 12 a${CURL * 0.62} 1.9 0 1 ${side > 0 ? 0 : 1} ${-side * CURL * 1.24} 0.3 a${CURL * 0.34} 1 0 1 ${side > 0 ? 0 : 1} ${side * CURL * 0.6} -0.2`, fill: 'none', stroke: 'paper', strokeWidth: 0.9 },
    ];
  };
  return [
    softShadow(sheet),
    { tag: 'path', d: sheet, fill: PARCHMENT },
    {
      tag: 'g',
      clip: sheet,
      children: [
        ...stains,
        // Lit along its middle, where it lies flat.
        { tag: 'rect', x: w * 0.2, y: 16, width: w * 0.6, height: 9, fill: 'white', blur: 6, opacity: OPACITY.shade },
        ...creases,
        { tag: 'path', d: `M26 17.5 H${w - 26} M26 36.5 H${w - 26}`, fill: 'none', stroke: 'onPaper', strokeWidth: 0.7, opacity: OPACITY.line },
        ...charted,
      ],
    },
    ...sealed,
    ...curl(7, 1), ...curl(w - 7, -1),
  ];
}

// Gothic: a torn drape hung from an iron rod.
function drape(w) {
  const random = seededRandom(`banner-drape-${Math.round(w)}`);
  const hem = [];
  for (let x = w - 6; x > 6; x -= 9 + random() * 10) hem.push([x, 36 + random() * 6], [x - 3 - random() * 3, 33 + random() * 3]);
  const points = [[6, 9], [w - 6, 9], ...hem, [6, 38]];
  const cloth = polygonPath(points);
  const folds = [];
  for (let x = 30; x < w - 20; x += 48 + random() * 20) {
    folds.push(...sketch('line', x, 9, x + (random() - 0.5) * 6, 42, { seed: Math.round(x), roughness: 0.8, stroke: 'edge', strokeWidth: 2, opacity: OPACITY.line }));
  }
  return [
    castShadow(points),
    ...sketch('path', cloth, { seed: 1, roughness: 0.6, stroke: 'edge', strokeWidth: 1.5, fill: 'accentMuted', fillStyle: 'solid' }),
    { tag: 'g', clip: cloth, children: folds },
    ...sketch('line', -10, 9, w + 10, 9, { seed: 4, roughness: 0.3, stroke: 'edge', strokeWidth: 3.6 }),
    ...[[-10, -1], [w + 10, 1]].flatMap(([x, s], k) => sketch('polygon', [[x, 5], [x + s * 7, 9], [x, 13], [x - s * 2, 9]], { seed: 5 + k, roughness: 0.3, stroke: 'edge', strokeWidth: 1.1, fill: 'textSecondary', fillStyle: 'solid' })),
  ];
}

// Astral: a band of night between two crescent moons, each in its own
// light, a few stars caught in the band.
function moons(w) {
  const random = seededRandom(`banner-moons-${Math.round(w)}`);
  const stars = Array.from({ length: Math.round(w / 50) }, () => ({ tag: 'circle', cx: 34 + random() * (w - 68), cy: 17 + random() * 18, r: 0.7 + random() * 1.1, fill: 'accentHighlight', opacity: OPACITY.heavy }));
  const moon = (x, s) => {
    const d = polygonPath(crescentPoints([x, 27, 15], [x + s * 6, 23, 12]));
    return [{ tag: 'path', d, fill: 'accentHighlight', blur: 3, opacity: OPACITY.line }, { tag: 'path', d, fill: BRASS }];
  };
  return [
    { tag: 'rect', x: 20, y: 13, width: w - 40, height: 28, fill: GLASS, opacity: OPACITY.veil },
    ...[13, 40.2].map((y) => ({ tag: 'rect', x: 20, y, width: w - 40, height: 0.8, fill: 'accentMuted' })),
    ...stars,
    ...moon(14, 1), ...moon(w - 14, -1),
  ];
}

// Dark glass, top to foot: a pane, a band of night.
const GLASS = Object.freeze({ shade: [[0, 'surfaceRaised'], [1, 'surfaceSunken']] });
// A metal's sheen, top to foot, in roles: lit, the metal, its shade.
const BRASS = Object.freeze({ shade: [[0, 'accentHighlight'], [0.45, 'accent'], [1, 'accentMuted']] });
const IRON = Object.freeze({ shade: [[0, 'surfaceHeader'], [1, 'surfaceDeep']] });
const STONE = Object.freeze({ shade: [[0, 'surfaceRaised'], [0.5, 'surfaceHeader'], [1, 'surfaceDeep']] });

// A gear's outline: `teeth` teeth round a wheel `r` px across its tips.
const gearPoints = (cx, cy, r, teeth) => Array.from({ length: teeth * 4 }, (_, i) => {
  const angle = (i / (teeth * 4)) * Math.PI * 2;
  const reach = i % 4 < 2 ? r : r * 0.78;
  return [cx + Math.cos(angle) * reach, cy + Math.sin(angle) * reach];
});
const gear = (cx, cy, r, teeth, fill) => [
  { tag: 'path', d: polygonPath(gearPoints(cx, cy, r, teeth)), fill, stroke: 'edge', strokeWidth: 1.2 },
  { tag: 'circle', cx, cy, r: r * 0.36, fill: 'accentMuted', stroke: 'edge', strokeWidth: 1 },
  { tag: 'circle', cx, cy, r: r * 0.12, fill: 'edge' },
];

// Steampunk: the lower city. A plate of blackened iron, riveted along both
// edges and seamed where its sheets meet, between two brass pipes that catch
// the light and throw their shadow on it, a flange bolted round each; a
// chemical glow along its foot; and at its far end, where the bar has room, a
// pressure gauge with a gear meshed behind it.
function undercity(w) {
  const band = polygonPath([[8, 12], [w - 8, 12], [w - 8, 44], [8, 44]]);
  const rivets = [];
  for (let x = 18; x < w - 12; x += 24) [17, 39.5].forEach((cy) => rivets.push(...stud(x, cy, 1.7, BRASS)));
  const seams = [];
  for (let x = 96; x < w - 60; x += 110) seams.push({ tag: 'rect', x, y: 12, width: 1.2, height: 32, fill: 'black', opacity: OPACITY.strong }, { tag: 'rect', x: x + 1.2, y: 12, width: 0.8, height: 32, fill: 'white', opacity: OPACITY.soft });
  const pipe = (y, height) => [
    { tag: 'rect', x: 0, y, width: w, height, rx: height / 2, fill: BRASS },
    glint(4, y + height * 0.2, w - 8, height * 0.16, OPACITY.edge),
  ];
  const flange = (x) => [
    { tag: 'rect', x: x - 1.5, y: 0.5, width: 10, height: 13, rx: 1.5, fill: BRASS },
    { tag: 'rect', x: x - 1.5, y: 9, width: 10, height: 4.5, rx: 1.5, fill: 'accentMuted', opacity: OPACITY.heavy },
    glint(x, 2, 1.4, 9),
    ...[x + 1.2, x + 6].map((cx) => ({ tag: 'circle', cx, cy: 4, r: 0.9, fill: 'surfaceDarkest' })),
  ];
  // The gauge: a brass rim, a paper face with its ticks, a red needle, a
  // light on its glass.
  const gauge = (cx, cy) => {
    const ticks = [-140, -105, -70, -35, 0].map((turn) => {
      const angle = (turn * Math.PI) / 180;
      return `M${cx + Math.cos(angle) * 6.2} ${cy + Math.sin(angle) * 6.2} L${cx + Math.cos(angle) * 8} ${cy + Math.sin(angle) * 8}`;
    }).join(' ');
    const needle = (-62 * Math.PI) / 180;
    return [
      { tag: 'circle', cx, cy: cy + 2, r: 11.5, fill: 'black', blur: 2, opacity: OPACITY.strong },
      { tag: 'circle', cx, cy, r: 11.5, fill: BRASS },
      { tag: 'circle', cx, cy, r: 9, fill: 'paper' },
      { tag: 'path', d: ticks, fill: 'none', stroke: 'onPaper', strokeWidth: 0.8 },
      { tag: 'path', d: `M${cx} ${cy} L${cx + Math.cos(needle) * 7.4} ${cy + Math.sin(needle) * 7.4}`, fill: 'none', stroke: 'danger', strokeWidth: 1.3 },
      { tag: 'circle', cx, cy, r: 1.5, fill: 'onPaper' },
      { tag: 'ellipse', cx: cx - 3, cy: cy - 4.6, rx: 3.6, ry: 1.5, fill: 'white', opacity: OPACITY.edge },
    ];
  };
  let works = [];
  if (w > 300) works = [...gear(w - 62, 22, 10, 8, 'secondary'), ...gauge(w - 32, 28)];
  else if (w > 240) works = gauge(w - 26, 28);
  return [
    softShadow(band),
    { tag: 'path', d: band, fill: IRON },
    {
      tag: 'g',
      clip: band,
      children: [
        ...seams,
        { tag: 'rect', x: 0, y: 11, width: w, height: 4, fill: 'black', blur: 1.5, opacity: OPACITY.heavy },
        { tag: 'rect', x: 0, y: 36, width: w, height: 4, fill: 'success', blur: 3, opacity: OPACITY.edge },
        { tag: 'rect', x: 14, y: 37.5, width: w - 28, height: 1.4, fill: 'success' },
      ],
    },
    ...rivets,
    ...pipe(3, 9), ...pipe(44.5, 7),
    ...[w * 0.3, w * 0.65].flatMap(flange),
    ...works,
  ];
}

// Dwarven: a carved lintel. Dark stone with its corners cut and a bevel
// round its face, an angular interlace inlaid in gold along both edges, a
// gold emblem of nested diamonds at its far end.
function lintel(w) {
  const points = [[14, 3], [w - 14, 3], [w - 4, 13], [w - 4, 41], [w - 14, 51], [14, 51], [4, 41], [4, 13]];
  const face = [[17, 7], [w - 17, 7], [w - 8, 16], [w - 8, 38], [w - 17, 47], [17, 47], [8, 38], [8, 16]];
  const interlace = (y, dir) => {
    let d = '';
    for (let x = 18; x < w - 22; x += 12) d += `M${x} ${y} L${x + 6} ${y + dir * 4} L${x + 12} ${y} M${x} ${y + dir * 4} L${x + 6} ${y} L${x + 12} ${y + dir * 4} `;
    return { tag: 'path', d, fill: 'none', stroke: 'warning', strokeWidth: 1.1 };
  };
  const diamond = (cx, cy, r, fill) => ({ tag: 'path', d: polygonPath([[cx, cy - r], [cx + r, cy], [cx, cy + r], [cx - r, cy]]), fill, stroke: 'edge', strokeWidth: 1 });
  // The emblem only where the bar has room past its title.
  const emblem = w > 300 ? [diamond(w - 32, 27, 12, 'warning'), diamond(w - 32, 27, 8, 'surfaceHeader'), diamond(w - 32, 27, 5, 'warning')] : [];
  return [
    { tag: 'path', d: polygonPath(points), fill: STONE, stroke: 'edge', strokeWidth: 1.6 },
    { tag: 'path', d: polygonPath(face), fill: 'none', stroke: 'edge', strokeWidth: 1.2, opacity: OPACITY.heavy },
    { tag: 'path', d: polygonPath(face.map(([x, y]) => [x + 0.8, y + 0.8])), fill: 'none', stroke: 'textSecondary', strokeWidth: 0.8, opacity: OPACITY.strong },
    interlace(10.5, 1), interlace(43.5, -1),
    ...emblem,
  ];
}

// Fey: a long slim leaf, lit from above, its midrib a thread of light, a
// blossom at its far tip.
const FROND = Object.freeze({ shade: [[0, 'success'], [1, 'secondaryStrong']] });
function leaf(w) {
  const edge = (sign) => Array.from({ length: 61 }, (_, i) => {
    const u = i / 60;
    return [-6 + u * (w + 12), 27 + sign * (12 * Math.sin(Math.PI * u) ** 0.55 + 1.2 * Math.abs(Math.sin(u * Math.PI * Math.max(6, w / 26))))];
  });
  const petals = Array.from({ length: 5 }, (_, q) => {
    const angle = (q / 5) * Math.PI * 2;
    return { tag: 'circle', cx: w + 6 + Math.cos(angle) * 3.6, cy: 27 + Math.sin(angle) * 3.6, r: 2.8, fill: 'secondary' };
  });
  return [
    { tag: 'path', d: polygonPath([...edge(-1), ...edge(1).reverse()]), fill: FROND, opacity: OPACITY.strong },
    { tag: 'path', d: `M-4 27 Q${w * 0.5} 25.5 ${w + 4} 27`, fill: 'none', stroke: 'textPrimary', strokeWidth: 0.7, opacity: OPACITY.edge },
    ...petals,
    { tag: 'circle', cx: w + 6, cy: 27, r: 1.7, fill: 'warning' },
  ];
}

// Sci-fi: a HUD plate, chamfered, its edge lit, a tab and a gauge.
function hud(w) {
  const points = [[10, 10], [w - 30, 10], [w - 22, 18], [w - 8, 18], [w - 8, 43], [24, 43], [16, 35], [10, 35]];
  const outline = polygonPath(points);
  const cells = [];
  for (let x = w - 58, k = 0; x < w - 14; x += 6, k += 1) cells.push({ tag: 'rect', x, y: 37, width: 3, height: 3, fill: k < 5 ? 'accent' : 'edge', opacity: k < 5 ? undefined : OPACITY.line });
  return [
    { tag: 'path', d: outline, fill: 'none', stroke: 'edge', strokeWidth: 2.4, blur: 2, opacity: OPACITY.strong },
    { tag: 'path', d: outline, fill: 'surfaceHeader' },
    { tag: 'path', d: outline, fill: 'none', stroke: 'edge', strokeWidth: 1.2 },
    { tag: 'rect', x: 2, y: 15, width: 4, height: 15, fill: 'accent' },
    ...cells,
  ];
}

// Cyberpunk: a thin slanted sign plate in the full accent, a hazard block at
// its far end, one glitch slice.
function glitch(w) {
  const points = [[12, 15], [w - 4, 15], [w - 12, 39], [4, 39]];
  const sign = polygonPath(points);
  const hazard = [];
  for (let x = w - 44; x < w + 10; x += 12) hazard.push({ tag: 'path', d: `M${x} 0 L${x + 6} 0 L${x - 10} 54 L${x - 16} 54 Z`, fill: 'edge' });
  return [
    { tag: 'path', d: sign, fill: 'accent' },
    { tag: 'g', clip: sign, children: [...hazard, { tag: 'rect', x: w - 48, y: 0, width: 3, height: 54, fill: 'edge' }] },
    // The slice by the hazard block, only where the bar has room past its title.
    ...(w < 360 ? [] : [{ tag: 'rect', x: w - 104, y: 34, width: 48, height: 2, fill: 'info', opacity: OPACITY.heavy }]),
  ];
}

// Pixel: an arcade marquee, cell by cell. A black sign in a neon frame, its
// corners stepped, a row of lights along its top and its foot, its pixel
// shadow dropped a cell down and right. One path per colour, every cell a
// square in it.
function marquee(w) {
  const cell = 3;
  const left = 0;
  const top = 2;
  const rows = 13;
  const columns = Math.floor(w / cell);
  const cells = new Map();
  for (let gx = 0; gx < columns; gx += 1) {
    for (let gy = 0; gy < rows; gy += 1) {
      const fromEnd = Math.min(gx, columns - 1 - gx);
      const fromEdge = Math.min(gy, rows - 1 - gy);
      // The stepped corners: a cell off each corner, two off its very tip.
      if (fromEnd + fromEdge < 2) continue;
      const ring = fromEnd === 0 || fromEdge === 0 || (fromEnd === 1 && fromEdge <= 1) || (fromEdge === 1 && fromEnd <= 1);
      const light = fromEdge === 2 && fromEnd >= 3 && gx % 4 === 0;
      let role = 'edge';
      if (ring) role = 'secondary';
      else if (light) role = (gx / 4) % 2 ? 'accent' : 'danger';
      cells.set(`${gx},${gy + top}`, role);
    }
  }
  const square = (gx, gy) => `M${left + gx * cell} ${gy * cell}h${cell}v${cell}h-${cell}Z`;
  const byColour = new Map();
  const shadow = [];
  cells.forEach((role, key) => {
    const [gx, gy] = key.split(',').map(Number);
    if (!cells.has(`${gx + 1},${gy + 1}`)) shadow.push(square(gx + 1, gy + 1));
    if (!byColour.has(role)) byColour.set(role, []);
    byColour.get(role).push(square(gx, gy));
  });
  return [{
    tag: 'g',
    crisp: true,
    children: [
      { tag: 'path', d: shadow.join(''), fill: 'edge', opacity: OPACITY.strong },
      ...[...byColour].map(([role, squares]) => ({ tag: 'path', d: squares.join(''), fill: role })),
    ],
  }];
}

// Abyssal: two boards of a wreck, long in the water. Both ends broken off,
// the seam between the boards, their grain and a knot or two, a nail head at
// each end; wet along the top, dark below, moss bloomed on it and barnacles
// in clusters (as its width seeds them), weed hanging from its foot and a
// few sparks of the deep's own light.
const SODDEN = Object.freeze({ shade: [[0, 'accentMuted'], [1, 'surfaceDeep']] });
function plank(w) {
  const random = seededRandom(`banner-plank-${Math.round(w)}`);
  const top = [];
  for (let x = 6; x < w - 6; x += 26) top.push([x, 11 + (random() - 0.5) * 1.6]);
  const board = polygonPath([
    ...top, [w - 5, 11], [w, 16], [w - 4, 22], [w + 1, 28], [w - 3, 35], [w, 40], [w - 5, 43],
    [5, 43], [0, 40], [3, 35], [-1, 28], [4, 22], [0, 16],
  ]);
  const grain = [15, 19, 23, 31, 35, 39].map((y) => {
    const lift = (random() - 0.5) * 2.4;
    return { tag: 'path', d: `M-4 ${y} Q${w * 0.28} ${y + lift} ${w * 0.55} ${y} T${w + 4} ${y + lift * 0.5}`, fill: 'none', stroke: 'surfaceDarkest', strokeWidth: 0.7, opacity: OPACITY.edge };
  });
  const knots = Array.from({ length: w > 260 ? 2 : 1 }, () => {
    const [cx, cy] = [w * (0.25 + random() * 0.5), random() < 0.5 ? 19 : 35];
    return [
      { tag: 'ellipse', cx, cy, rx: 5, ry: 2.6, fill: 'surfaceDarkest', opacity: OPACITY.strong },
      { tag: 'ellipse', cx, cy, rx: 7.5, ry: 4, fill: 'none', stroke: 'surfaceDarkest', strokeWidth: 0.7, opacity: OPACITY.edge },
    ];
  }).flat();
  const moss = Array.from({ length: Math.max(2, Math.round(w / 120)) }, () => ({
    tag: 'ellipse', cx: random() * w, cy: 12 + random() * 6, rx: 14 + random() * 22, ry: 3 + random() * 4, fill: 'success', blur: 3, opacity: OPACITY.line,
  }));
  const nails = [[10, 19], [10, 35], [w - 10, 19], [w - 10, 35]].flatMap(([cx, cy]) => stud(cx, cy, 2, 'outline'));
  // A cluster: a few barnacles side by side, each a pale cone with a dark mouth.
  const barnacles = Array.from({ length: Math.max(2, Math.round(w / 90)) }, () => {
    const [cx, cy] = [w * 0.4 + random() * (w * 0.52), random() < 0.5 ? 12.5 : 41.5];
    return Array.from({ length: 2 + Math.round(random() * 2) }, (_, k) => {
      const [x, y, r] = [cx + k * 4.2 - 4, cy + (random() - 0.5) * 2.4, 1.8 + random() * 1.3];
      return [
        { tag: 'circle', cx: x, cy: y + 0.8, r: r + 0.4, fill: 'black', blur: 1, opacity: OPACITY.strong },
        { tag: 'circle', cx: x, cy: y, r, fill: 'paperShade' },
        { tag: 'circle', cx: x, cy: y, r: r * 0.45, fill: 'surfaceDarkest' },
      ];
    }).flat();
  }).flat();
  const weed = w > 200 ? Array.from({ length: Math.max(3, Math.round(w / 100)) }, () => {
    const [x, reach, sway] = [14 + random() * (w - 28), 5 + random() * 6, (random() - 0.5) * 8];
    return { tag: 'path', d: `M${x} 42 q${sway} ${reach * 0.5} ${sway * 0.3} ${reach} t${-sway * 0.4} ${reach * 0.25}`, fill: 'none', stroke: 'success', strokeWidth: 1.5, opacity: OPACITY.strong };
  }) : [];
  const sparks = Array.from({ length: Math.round(w / 80) }, () => {
    const [cx, cy] = [20 + random() * (w - 40), 14 + random() * 26];
    return [
      { tag: 'circle', cx, cy, r: 2.2, fill: 'accentHighlight', blur: 2, opacity: OPACITY.strong },
      { tag: 'circle', cx, cy, r: 0.7, fill: 'accentHighlight' },
    ];
  }).flat();
  return [
    softShadow(board),
    ...weed,
    { tag: 'path', d: board, fill: SODDEN },
    {
      tag: 'g',
      clip: board,
      children: [
        ...grain, ...knots, ...moss,
        { tag: 'rect', x: -2, y: 26.4, width: w + 4, height: 1.3, fill: 'surfaceDarkest', opacity: OPACITY.heavy },
        { tag: 'rect', x: -2, y: 27.7, width: w + 4, height: 0.6, fill: 'white', opacity: OPACITY.tint },
        { tag: 'rect', x: -2, y: 35, width: w + 4, height: 10, fill: 'black', blur: 3, opacity: OPACITY.edge },
        glint(4, 11.4, w - 8, 1, OPACITY.shade),
      ],
    },
    ...nails, ...barnacles, ...sparks,
  ];
}

// Superhero: a narrator's caption box in the full accent, a little askew,
// inked thick, Ben-Day dots fading in from its far end, a starburst on it.
function caption(w) {
  const points = [[4, 10], [w - 4, 8], [w - 2, 42], [2, 44]];
  const box = polygonPath(points);
  const dots = [];
  for (let x = w - 120, column = 0; x < w; x += 6, column += 1) {
    for (let y = 11 + (column % 2) * 3; y < 44; y += 6) {
      dots.push({ tag: 'circle', cx: x, cy: y, r: Math.min(1.8, 0.4 + (column / 20) * 1.4), fill: 'accentMuted' });
    }
  }
  const burst = Array.from({ length: 16 }, (_, i) => {
    const angle = -Math.PI / 2 + (i * Math.PI) / 8;
    const reach = i % 2 ? 7 : 14;
    return [w - 34 + Math.cos(angle) * reach, 26 + Math.sin(angle) * reach];
  });
  return [
    castShadow(points),
    ...sketch('path', box, { seed: 2, roughness: 0.4, fill: 'accent', fillStyle: 'solid' }),
    { tag: 'g', clip: box, children: dots },
    ...sketch('path', box, { seed: 3, roughness: 0.4, stroke: 'edge', strokeWidth: 2.6 }),
    // The burst only where the bar has room past its title.
    ...(w < 300 ? [] : sketch('polygon', burst, { seed: 4, roughness: 0.5, stroke: 'edge', strokeWidth: 1.8, fill: 'secondary', fillStyle: 'solid' })),
  ];
}

// A banner of a style lit rather than drawn (shapes.js light) is made of what
// the light falls on: clean shapes shaded top to foot, a glow, a rule; no
// sketched line under it and no cast shadow.

// Noir: the lettering on an office door. A pane of dark glass under a brass
// hairline, the lamp caught in its near end, and under it three art-deco
// rules running out, each shorter than the one above.
function doorglass(w) {
  const pane = `M0 10 H${w} V44 H0 Z`;
  // Each rule: how far it runs, where, how thick, in what.
  const rules = [[w, 46, 1.4, 'accent'], [w - 20, 49.2, 0.9, 'accentMuted'], [w - 48, 51.8, 0.9, 'accentMuted']];
  return [
    { tag: 'path', d: pane, fill: GLASS, opacity: OPACITY.veil },
    { tag: 'g', clip: pane, children: [{ tag: 'ellipse', cx: 0, cy: 10, rx: Math.min(w * 0.5, 220), ry: 30, fill: 'accentHighlight', blur: 10, opacity: OPACITY.fill }] },
    { tag: 'rect', x: 0, y: 9.2, width: w, height: 0.8, fill: 'accentMuted' },
    ...rules.map(([length, y, height, fill]) => ({ tag: 'rect', x: 0, y, width: Math.max(0, length), height, fill })),
  ];
}

// War: a plate of rusted steel bolted across the panel's head. Its corners
// cut, worn bright along its top, rust bloomed over it (as its width seeds
// it; in the palette's orange, never its red: on a pale plate red reads as
// blood), a bolt at each corner.
function plate(w) {
  const random = seededRandom(`banner-plate-${Math.round(w)}`);
  const outline = polygonPath([[3, 10], [w - 3, 10], [w, 13], [w, 41], [w - 3, 44], [3, 44], [0, 41], [0, 13]]);
  const rust = Array.from({ length: Math.max(2, Math.round(w / 140)) }, () => ({
    tag: 'ellipse', cx: random() * w, cy: 14 + random() * 28, rx: 18 + random() * 34, ry: 5 + random() * 9, fill: 'warningStrong', blur: 4, opacity: OPACITY.shade,
  }));
  const bolt = ([cx, cy]) => [{ tag: 'circle', cx, cy, r: 2.4, fill: 'outline' }, { tag: 'circle', cx: cx - 0.5, cy: cy - 0.5, r: 1, fill: 'surfaceDarkest' }];
  return [
    { tag: 'path', d: outline, fill: STONE, stroke: 'edge', strokeWidth: 1 },
    { tag: 'g', clip: outline, children: [...rust, { tag: 'rect', x: 0, y: 10, width: w, height: 1.2, fill: 'textPrimary', opacity: OPACITY.tint }] },
    ...[[8, 16], [w - 8, 16], [8, 38], [w - 8, 38]].flatMap(bolt),
  ];
}

const BANNERS = Object.freeze({ ribbon, scroll, drape, moons, undercity, lintel, leaf, hud, glitch, marquee, plank, caption, doorglass, plate });

// How each banner's title is lettered: the ink that reads `on` a role of the
// drawing, or a role's `color`; outlined in a role (`halo`) where the drawing
// is busy under the letters, or `inked` as the comic letters (an ink outline
// and its shadow).
const BANNER_TITLES = Object.freeze({
  ribbon: Object.freeze({ color: 'paper', inked: true }),
  scroll: Object.freeze({ on: 'paperShade' }),
  drape: Object.freeze({ on: 'accentMuted' }),
  moons: Object.freeze({ color: 'accentText' }),
  undercity: Object.freeze({ color: 'textPrimary' }),
  lintel: Object.freeze({ color: 'warning' }),
  leaf: Object.freeze({ color: 'textPrimary', halo: 'surfaceHeader' }),
  hud: Object.freeze({ color: 'accentText' }),
  glitch: Object.freeze({ on: 'accent' }),
  marquee: Object.freeze({ color: 'accent' }),
  plank: Object.freeze({ color: 'textPrimary' }),
  caption: Object.freeze({ on: 'accent' }),
  doorglass: Object.freeze({ color: 'accentText' }),
  plate: Object.freeze({ color: 'textPrimary' }),
});

// How far, px, a banner's ends reach past the panel's sides (the comic's
// tails). A panel whose banner reaches lets it past its frame (surfaces.js).
const BANNER_REACH = Object.freeze({ ribbon: 12 });

export const BANNER_KINDS = Object.freeze(['none', ...Object.keys(BANNERS)]);

// How the banner `kind` letters its title (BANNER_TITLES); null for 'none'.
export function bannerTitle(kind) {
  return BANNER_TITLES[kind] || null;
}

// How far the banner `kind` reaches past the panel's sides, px.
export function bannerReach(kind) {
  return BANNER_REACH[kind] || 0;
}

// The banner `kind` across a bar `width` px wide in the style `styleId` (whose
// screentone a ribbon takes): its `pieces`, set in from the bar's ends (less
// by its reach), and the `box` they are seen through (BANNER_HEIGHT high, from
// that inset before the drawing's start: the bar's left). Null for 'none'.
const drawn = drawingCache((kind, width, styleId) => {
  const inset = BANNER_INSET - bannerReach(kind);
  return {
    box: { left: -inset, top: 0, width, height: BANNER_HEIGHT },
    pieces: BANNERS[kind](width - inset * 2, styleShapes(styleId)),
  };
});
export function panelBanner(kind, width, styleId) {
  return BANNERS[kind] ? drawn(kind, width, styleId) : null;
}
