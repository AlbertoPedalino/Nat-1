import { OPACITY } from './colors.js';
import { seededRandom } from '../seededRandom.js';
import { styleShapes } from './shapes.js';
import { crescentPoints, drawingCache, polygonPath, raggedEdge, sketch } from './handDrawing.js';

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

// Pirate: a parchment scroll, its edges torn, rolled up at both ends.
function scroll(w) {
  const random = seededRandom(`banner-scroll-${Math.round(w)}`);
  const points = [...raggedEdge(12, w - 12, 13, 1.2, 10, random), ...raggedEdge(w - 12, 12, 40, 1.4, 10, random)];
  const sheet = polygonPath(points);
  const roll = (x, s, seed) => [
    ...sketch('rectangle', x - 7, 10, 14, 33, { seed, roughness: 0.5, stroke: 'edge', strokeWidth: 1.4, fill: 'paperShade', fillStyle: 'solid' }),
    ...sketch('ellipse', x - s * 7, 26.5, 6, 33, { seed: seed + 1, roughness: 0.4, stroke: 'edge', strokeWidth: 1.3, fill: 'accentMuted', fillStyle: 'solid' }),
  ];
  return [
    castShadow(points),
    ...sketch('path', sheet, { seed: 1, roughness: 0.7, stroke: 'edge', strokeWidth: 1.4, fill: 'paperShade', fillStyle: 'solid' }),
    ...roll(4, 1, 10), ...roll(w - 4, -1, 20),
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

// War: a strip of field tape, a little askew, torn at both ends, stamped in red.
function tape(w) {
  const random = seededRandom(`banner-tape-${Math.round(w)}`);
  const torn = (x, dir) => Array.from({ length: 8 }, (_, i) => [x + (i % 2 ? dir * (2 + random() * 2.5) : 0), 13 + i * 4]);
  const points = [[4, 13], ...raggedEdge(4, w - 4, 13, 0.5, 14, random).slice(1, -1), ...torn(w - 4, -1), ...raggedEdge(w - 4, 4, 41, 0.5, 14, random).slice(1, -1), ...torn(4, 1).reverse()];
  const strip = polygonPath(points);
  const stamp = w - 40;
  const star = Array.from({ length: 10 }, (_, i) => {
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    const reach = i % 2 ? 3 : 7;
    return [stamp + Math.cos(angle) * reach, 27 + Math.sin(angle) * reach];
  });
  // The stamp only where the bar has room past its title.
  const stamped = w < 300 ? [] : [
    ...sketch('circle', stamp, 27, 26, { seed: 3, roughness: 1, stroke: 'accent', strokeWidth: 2 }),
    ...sketch('circle', stamp, 27, 19, { seed: 4, roughness: 1, stroke: 'accent', strokeWidth: 1 }),
    ...sketch('polygon', star, { seed: 5, roughness: 0.6, stroke: 'accent', strokeWidth: 1, fill: 'accent', fillStyle: 'solid', opacity: OPACITY.veil }),
  ];
  return [
    { tag: 'g', transform: `rotate(-1 ${w / 2} 27)`, children: [castShadow(points), ...sketch('path', strip, { seed: 1, roughness: 0.5, stroke: 'edge', strokeWidth: 1.2, fill: 'paperShade', fillStyle: 'solid' })] },
    ...stamped,
  ];
}

// Astral: a night band between two crescent moons, a few stars caught in it.
function moons(w) {
  const random = seededRandom(`banner-moons-${Math.round(w)}`);
  const stars = Array.from({ length: Math.round(w / 50) }, () => ({ tag: 'circle', cx: 34 + random() * (w - 68), cy: 17 + random() * 18, r: 0.7 + random() * 1.1, fill: 'accentHighlight', opacity: OPACITY.heavy }));
  const moon = (x, s, seed) => sketch('polygon', crescentPoints([x, 27, 15], [x + s * 6, 23, 12]), { seed, roughness: 0.4, stroke: 'edge', strokeWidth: 1.4, fill: 'accentMuted', fillStyle: 'solid' });
  return [
    castShadow([[20, 13], [w - 20, 13], [w - 20, 41], [20, 41]]),
    ...sketch('rectangle', 20, 13, w - 40, 28, { seed: 1, roughness: 0.3, stroke: 'accentMuted', strokeWidth: 1.4, fill: 'surfaceHeader', fillStyle: 'solid' }),
    ...stars,
    ...moon(14, 1, 7), ...moon(w - 14, -1, 9),
  ];
}

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

// Steampunk: the lower city. Blackened iron between two copper pipes, a
// chemical glow along its foot, rivets along its top, and at its far end
// two gears meshed, brass and verdigris.
function undercity(w) {
  const points = [[8, 12], [w - 8, 12], [w - 8, 44], [8, 44]];
  const band = polygonPath(points);
  const rivets = [];
  for (let x = 18; x < w - 12; x += 22) rivets.push({ tag: 'circle', cx: x, cy: 17, r: 1.6, fill: 'accentMuted', stroke: 'edge', strokeWidth: 0.6 });
  const pipe = (y, height) => ({ tag: 'rect', x: 0, y, width: w, height, rx: 3, fill: BRASS, stroke: 'edge', strokeWidth: 1 });
  const collars = [w * 0.3, w * 0.65].map((x) => ({ tag: 'rect', x, y: 1, width: 6, height: 12, rx: 1, fill: 'accentMuted', stroke: 'edge', strokeWidth: 1 }));
  // Two gears where the bar has room past its title, one where it has a
  // little, none on a narrow panel's bar (its title runs to the end).
  let gears = [];
  if (w > 300) gears = [...gear(w - 60, 20, 9, 8, 'secondary'), ...gear(w - 34, 28, 16, 10, BRASS)];
  else if (w > 240) gears = gear(w - 24, 28, 12, 9, BRASS);
  return [
    castShadow(points),
    { tag: 'path', d: band, fill: IRON, stroke: 'edge', strokeWidth: 1.5 },
    {
      tag: 'g',
      clip: band,
      children: [
        { tag: 'rect', x: 0, y: 36, width: w, height: 4, fill: 'success', blur: 3, opacity: OPACITY.edge },
        { tag: 'rect', x: 14, y: 37.5, width: w - 28, height: 1.4, fill: 'success' },
      ],
    },
    ...rivets,
    pipe(3, 8), pipe(45, 6), ...collars,
    ...gears,
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
    castShadow(points),
    { tag: 'path', d: polygonPath(points), fill: STONE, stroke: 'edge', strokeWidth: 1.6 },
    { tag: 'path', d: polygonPath(face), fill: 'none', stroke: 'edge', strokeWidth: 1.2, opacity: OPACITY.heavy },
    { tag: 'path', d: polygonPath(face.map(([x, y]) => [x + 0.8, y + 0.8])), fill: 'none', stroke: 'textSecondary', strokeWidth: 0.8, opacity: OPACITY.strong },
    interlace(10.5, 1), interlace(43.5, -1),
    ...emblem,
  ];
}

// Fey: a long slim leaf, veined, a blossom at its far tip.
function leaf(w) {
  const edge = (sign) => Array.from({ length: 61 }, (_, i) => {
    const u = i / 60;
    return [-6 + u * (w + 12), 27 + sign * (12 * Math.sin(Math.PI * u) ** 0.55 + 1.2 * Math.abs(Math.sin(u * Math.PI * Math.max(6, w / 26))))];
  });
  const points = [...edge(-1), ...edge(1).reverse()];
  const blade = polygonPath(points);
  const veins = [];
  for (let x = 60; x < w - 30; x += 44) [-1, 1].forEach((s) => veins.push(...sketch('line', x, 27, x + 9, 27 + s * 8, { seed: x + s, roughness: 0.3, stroke: 'edge', strokeWidth: 0.6, opacity: OPACITY.edge })));
  const blossom = (x, y) => [
    ...Array.from({ length: 5 }, (_, q) => {
      const angle = (q / 5) * Math.PI * 2;
      return sketch('circle', x + Math.cos(angle) * 3.6, y + Math.sin(angle) * 3.6, 5.6, { seed: q, roughness: 0.4, stroke: 'edge', strokeWidth: 0.8, fill: 'secondary', fillStyle: 'solid' });
    }).flat(),
    ...sketch('circle', x, y, 3.4, { seed: 9, roughness: 0.2, stroke: 'edge', strokeWidth: 0.7, fill: 'warning', fillStyle: 'solid' }),
  ];
  return [
    castShadow(points),
    ...sketch('path', blade, { seed: 1, roughness: 0.5, stroke: 'edge', strokeWidth: 1.3, fill: 'success', fillStyle: 'solid', opacity: OPACITY.strong }),
    ...sketch('curve', [[-4, 27], [w * 0.5, 26], [w + 4, 27]], { seed: 3, roughness: 0.3, stroke: 'edge', strokeWidth: 0.8, opacity: OPACITY.edge }),
    ...veins,
    ...blossom(w + 6, 27),
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
    castShadow(points),
    { tag: 'path', d: outline, fill: 'surfaceHeader' },
    ...sketch('path', outline, { seed: 1, roughness: 0.15, stroke: 'edge', strokeWidth: 1.2 }),
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
    castShadow(points),
    ...sketch('path', sign, { seed: 1, roughness: 0.2, stroke: 'edge', strokeWidth: 1.8, fill: 'accent', fillStyle: 'solid' }),
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

// Abyssal: a wreck's plank, grained, a few barnacles on it.
function plank(w) {
  const random = seededRandom(`banner-plank-${Math.round(w)}`);
  const points = [[4, 12], ...raggedEdge(4, w - 4, 11, 1.2, 18, random).slice(1, -1), [w - 2, 12], [w, 27], [w - 4, 42], ...raggedEdge(w - 4, 4, 42, 1.4, 18, random).slice(1, -1), [2, 41], [0, 27]];
  const board = polygonPath(points);
  const grain = [19, 34].flatMap((y) => sketch('curve', Array.from({ length: 6 }, (_, i) => [-4 + (i / 5) * (w + 8), y + Math.sin(i * 1.3 + y) * 1.4]), { seed: y, roughness: 0.6, stroke: 'edge', strokeWidth: 0.8, opacity: OPACITY.edge }));
  const barnacles = Array.from({ length: Math.max(2, Math.round(w / 70)) }, (_, k) => {
    const x = w * 0.45 + random() * (w * 0.5);
    const y = random() < 0.5 ? 12 + random() * 2 : 40 + random() * 2;
    const r = 2 + random() * 1.8;
    return sketch('circle', x, y, r * 2, { seed: 20 + k, roughness: 0.5, stroke: 'edge', strokeWidth: 0.8, fill: 'paperShade', fillStyle: 'solid' });
  }).flat();
  return [
    castShadow(points),
    ...sketch('path', board, { seed: 1, roughness: 0.8, stroke: 'edge', strokeWidth: 1.6, fill: 'accentMuted', fillStyle: 'solid' }),
    { tag: 'g', clip: board, children: grain },
    ...barnacles,
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

// Noir: a manila case folder, its tab at the left, a red stamp on its far end.
function casefile(w) {
  const points = [[2, 15], [9, 8], [78, 8], [85, 15], [w - 2, 15], [w - 2, 44], [2, 44]];
  const folder = polygonPath(points);
  const stamped = w < 300 ? [] : [
    ...sketch('rectangle', w - 96, 21, 70, 17, { seed: 3, roughness: 0.9, stroke: 'danger', strokeWidth: 1.6 }),
    ...sketch('line', w - 88, 27, w - 34, 27, { seed: 4, roughness: 0.7, stroke: 'danger', strokeWidth: 2.2 }),
    ...sketch('line', w - 88, 32.5, w - 50, 32.5, { seed: 5, roughness: 0.7, stroke: 'danger', strokeWidth: 2.2 }),
  ];
  return [
    castShadow(points),
    ...sketch('path', folder, { seed: 1, roughness: 0.3, stroke: 'edge', strokeWidth: 1.2, fill: 'paperShade', fillStyle: 'solid' }),
    { tag: 'path', d: `M2 18.5 H${w - 2}`, fill: 'none', stroke: 'edge', strokeWidth: 0.8, opacity: OPACITY.edge },
    { tag: 'g', transform: `rotate(-3 ${w - 61} 29)`, opacity: OPACITY.heavy, children: stamped },
  ];
}

const BANNERS = Object.freeze({ ribbon, scroll, drape, tape, moons, undercity, lintel, leaf, hud, glitch, marquee, plank, caption, casefile });

// How each banner's title is lettered: the ink that reads `on` a role of the
// drawing, or a role's `color`; outlined in a role (`halo`) where the drawing
// is busy under the letters, or `inked` as the comic letters (an ink outline
// and its shadow).
const BANNER_TITLES = Object.freeze({
  ribbon: Object.freeze({ color: 'paper', inked: true }),
  scroll: Object.freeze({ on: 'paperShade' }),
  drape: Object.freeze({ on: 'accentMuted' }),
  tape: Object.freeze({ on: 'paperShade' }),
  moons: Object.freeze({ color: 'accentText' }),
  undercity: Object.freeze({ color: 'textPrimary' }),
  lintel: Object.freeze({ color: 'warning' }),
  leaf: Object.freeze({ color: 'textPrimary', halo: 'surfaceHeader' }),
  hud: Object.freeze({ color: 'accentText' }),
  glitch: Object.freeze({ on: 'accent' }),
  marquee: Object.freeze({ color: 'accent' }),
  plank: Object.freeze({ on: 'accentMuted', halo: 'accentMuted' }),
  caption: Object.freeze({ on: 'accent' }),
  casefile: Object.freeze({ on: 'paperShade' }),
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
