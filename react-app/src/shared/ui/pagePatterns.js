import { OPACITY, UI_COLORS, uiAlpha } from './colors.js';

// The page's own drawings, one per style (shapes.js surface.paper, every
// kind but the comic's sticker paper): a tile drawn in the palette's roles,
// repeated over the page behind the panels (surfaces.js surfaceVariables
// paints it in the palette's hexes). Each answers { svg, width, height },
// the tile's size in px. Drawn faint: the page's drawing (pageDrawing) and line
// (pageLine), the theme's hues at a low opacity.

const tint = (role, step) => uiAlpha(UI_COLORS[role], OPACITY[step]);
const svg = (width, height, body) => `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${body}</svg>`;
const round = (value) => Math.round(value * 10) / 10;

// A four-pointed sparkle `size` across its arms, at x, y.
function sparkle(x, y, size, fill) {
  const s = size / 2;
  const w = size / 8;
  return `<path d="M${x} ${round(y - s)} L${round(x + w)} ${round(y - w)} L${round(x + s)} ${y} L${round(x + w)} ${round(y + w)} L${x} ${round(y + s)} L${round(x - w)} ${round(y + w)} L${round(x - s)} ${y} L${round(x - w)} ${round(y - w)} Z" fill="${fill}"/>`;
}

// A gear's outline: `teeth` teeth of radius r round cx, cy.
function gear(cx, cy, r, teeth) {
  const points = [];
  for (let i = 0; i < teeth; i += 1) {
    const at = (i * 2 * Math.PI) / teeth;
    const step = Math.PI / teeth;
    [[-0.55, 0.78], [-0.3, 1], [0.3, 1], [0.55, 0.78]].forEach(([share, reach]) => {
      points.push(`${round(cx + r * reach * Math.cos(at + share * step))} ${round(cy + r * reach * Math.sin(at + share * step))}`);
    });
  }
  return `M${points.join(' L')} Z`;
}

// Cells of a pixel sprite (rows of '#' and '.') `cell` px square at x, y.
function sprite(x, y, cell, rows, fill) {
  return rows.flatMap((row, r) => [...row].map((mark, c) => (mark === '#'
    ? `<rect x="${x + c * cell}" y="${y + r * cell}" width="${cell}" height="${cell}" fill="${fill}"/>`
    : ''))).join('');
}

const LEAF = 'M0 -9 C6 -4 6 4 0 9 C-6 4 -6 -4 0 -9 Z';
const BAT = 'M0 2 C-3 -2 -6 -2 -8 0 C-10 -4 -14 -4 -16 -1 C-14 0 -13 3 -14 5 C-10 3 -6 4 -4 7 C-2 4 -1 3 0 4 C1 3 2 4 4 7 C6 4 10 3 14 5 C13 3 14 0 16 -1 C14 -4 10 -4 8 0 C6 -2 3 -2 0 2 Z';

const PATTERNS = Object.freeze({
  // Gothic: a chapel's lancet windows, bats and crosses.
  tracery: () => {
    const line = UI_COLORS.pageLine;
    const lancet = (x, y) => `<g transform="translate(${x} ${y})" fill="${UI_COLORS.pageDrawing}" stroke="${line}" stroke-width="3"><path d="M0 120 V55 Q0 12 30 0 Q60 12 60 55 V120 Z"/><path d="M30 120 V40" fill="none"/><circle cx="30" cy="34" r="9"/></g>`;
    const bat = (x, y, scale) => `<path transform="translate(${x} ${y}) scale(${scale})" d="${BAT}" fill="${tint('accent', 'line')}"/>`;
    const cross = (x, y) => `<path d="M${x} ${y - 9} V${y + 11} M${x - 6} ${y - 3} H${x + 6}" stroke="${tint('accent', 'line')}" stroke-width="3" fill="none"/>`;
    return { width: 180, height: 180, svg: svg(180, 180, lancet(18, 40) + bat(132, 38, 1.1) + bat(150, 120, 0.8) + cross(110, 150) + cross(150, 80)) };
  },
  // War: camouflage blotches under a run of barbed wire.
  camo: () => {
    const blot = (d, fill) => `<path d="${d}" fill="${fill}"/>`;
    const barbs = Array.from({ length: 8 }, (_, i) => 12 + i * 25).map((x) => `M${x - 4} 184 L${x + 4} 194 M${x + 4} 184 L${x - 4} 194`).join(' ');
    return {
      width: 200,
      height: 200,
      svg: svg(200, 200, [
        blot('M20 30 C40 10 80 20 90 40 C100 60 70 80 50 70 C30 65 5 50 20 30 Z', UI_COLORS.pageDrawing),
        blot('M120 100 C150 80 190 95 185 125 C180 150 140 160 120 140 C105 125 105 110 120 100 Z', UI_COLORS.pageDrawing),
        blot('M30 125 C50 115 70 130 65 150 C60 165 30 170 20 158 C10 145 15 132 30 125 Z', UI_COLORS.pageDrawing),
        blot('M110 20 C130 5 165 15 160 40 C155 60 125 60 115 45 C108 35 104 28 110 20 Z', tint('secondary', 'tint')),
        blot('M60 90 C80 85 95 100 85 115 C75 128 50 125 48 110 C46 100 50 93 60 90 Z', tint('secondary', 'tint')),
        `<path d="M0 189 H200 ${barbs}" stroke="${tint('textPrimary', 'shade')}" stroke-width="2" fill="none"/>`,
      ].join('')),
    };
  },
  // Sci-fi: a circuit board's traces and nodes.
  circuit: () => {
    const trace = tint('info', 'line');
    const node = tint('accent', 'strong');
    const paths = ['M0 40 H50 L70 60 H120 L140 40 H160', 'M40 160 V120 L60 100 V80', 'M100 0 V30 L120 50', 'M0 120 H20 L40 140 H100 L120 120 H160'];
    const nodes = [[70, 60], [60, 80], [120, 50], [40, 140], [120, 120]];
    return {
      width: 160,
      height: 160,
      svg: svg(160, 160, [
        ...paths.map((d) => `<path d="${d}" stroke="${trace}" stroke-width="2" fill="none"/>`),
        ...nodes.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.5" fill="${node}"/>`),
        `<rect x="86" y="86" width="20" height="14" rx="2" fill="none" stroke="${trace}" stroke-width="2"/>`,
      ].join('')),
    };
  },
  // Astral: a field of stars, a constellation, a crescent moon.
  stars: () => {
    const stars = [[20, 30, 7], [60, 82, 5], [110, 20, 9], [170, 60, 6], [200, 140, 7], [140, 120, 5], [30, 170, 8], [90, 200, 5], [180, 200, 6], [70, 130, 4], [150, 170, 4], [10, 100, 4]];
    return {
      width: 220,
      height: 220,
      svg: svg(220, 220, [
        `<path d="M110 20 L170 60 L140 120 L200 140" stroke="${tint('accent', 'line')}" stroke-width="1.2" stroke-dasharray="3 4" fill="none"/>`,
        ...stars.map(([x, y, size]) => sparkle(x, y, size * 2, size > 6 ? tint('textPrimary', 'strong') : tint('textPrimary', 'line'))),
        `<path d="M48 48 A13 13 0 1 0 62 68 A10 10 0 1 1 48 48 Z" fill="${tint('accent', 'edge')}"/>`,
      ].join('')),
    };
  },
  // Pirate: rows of waves and a compass rose.
  waves: () => {
    const row = (y, shift) => {
      let d = `M${-50 + shift} ${y} Q${-37.5 + shift} ${y - 9} ${-25 + shift} ${y}`;
      for (let x = 0; x <= 225; x += 25) d += ` T${x + shift} ${y}`;
      return `<path d="${d}" stroke="${tint('info', 'edge')}" stroke-width="2.5" fill="none"/>`;
    };
    return {
      width: 200,
      height: 200,
      svg: svg(200, 200, [
        row(30, 0), row(80, 12.5), row(130, 0), row(180, 12.5),
        `<circle cx="150" cy="55" r="13" fill="none" stroke="${tint('accent', 'line')}" stroke-width="1.5"/>`,
        sparkle(150, 55, 34, tint('accent', 'edge')),
      ].join('')),
    };
  },
  // Steampunk: a blueprint's grid and gears drawn on it.
  blueprint: () => {
    const minor = Array.from({ length: 10 }, (_, i) => i * 16).map((at) => `M${at} 0 V160 M0 ${at} H160`).join(' ');
    return {
      width: 160,
      height: 160,
      svg: svg(160, 160, [
        `<path d="${minor}" stroke="${tint('accent', 'soft')}" stroke-width="1" fill="none"/>`,
        `<path d="M0 0 V160 M80 0 V160 M0 0 H160 M0 80 H160" stroke="${tint('accent', 'tint')}" stroke-width="1.5" fill="none"/>`,
        `<path d="${gear(112, 48, 26, 10)}" stroke="${tint('accent', 'line')}" stroke-width="1.5" fill="none"/><circle cx="112" cy="48" r="7" stroke="${tint('accent', 'line')}" stroke-width="1.5" fill="none"/>`,
        `<path d="${gear(46, 116, 17, 8)}" stroke="${tint('accent', 'line')}" stroke-width="1.5" fill="none"/>`,
      ].join('')),
    };
  },
  // Dwarven: hewn stone blocks in courses, a rune cut in one.
  stone: () => {
    const courses = [[0, [0, 60, 110, 160]], [40, [0, 30, 95, 160]], [80, [0, 70, 120, 160]]];
    const blocks = courses.flatMap(([y, edges]) => edges.slice(1).map((x, i) => (
      `<rect x="${edges[i] + 1.5}" y="${y + 1.5}" width="${x - edges[i] - 3}" height="37" rx="3" fill="${UI_COLORS.pageDrawing}" stroke="${UI_COLORS.pageLine}" stroke-width="3"/>`
    )));
    return {
      width: 160,
      height: 120,
      svg: svg(160, 120, [
        ...blocks,
        `<path d="M62 50 V70 M62 55 L70 49 M62 61 L54 55" stroke="${tint('accent', 'edge')}" stroke-width="2.5" fill="none" stroke-linecap="round"/>`,
      ].join('')),
    };
  },
  // Fey: a vine with leaves and small flowers.
  leaves: () => {
    const leaf = (x, y, turn) => `<path transform="translate(${x} ${y}) rotate(${turn})" d="${LEAF}" fill="${tint('success', 'shade')}"/>`;
    const flower = (x, y) => [0, 72, 144, 216, 288].map((turn) => (
      `<circle cx="${round(x + 6 * Math.cos((turn * Math.PI) / 180))}" cy="${round(y + 6 * Math.sin((turn * Math.PI) / 180))}" r="4.5" fill="${tint('accent', 'line')}"/>`
    )).join('') + `<circle cx="${x}" cy="${y}" r="3" fill="${tint('warning', 'strong')}"/>`;
    return {
      width: 200,
      height: 200,
      svg: svg(200, 200, [
        `<path d="M0 140 C40 110 60 170 100 140 S160 110 200 140" stroke="${tint('success', 'line')}" stroke-width="2" fill="none"/>`,
        leaf(30, 128, -40), leaf(70, 152, 30), leaf(118, 126, -30), leaf(165, 132, 40),
        flower(50, 50), flower(150, 60), flower(110, 185),
      ].join('')),
    };
  },
  // Cosmic: ripples in the void, a reaching tentacle, watching eyes.
  void: () => {
    const eye = (x, y) => `<path d="M${x} ${y} C${x + 10} ${y - 8} ${x + 25} ${y - 8} ${x + 35} ${y} C${x + 25} ${y + 8} ${x + 10} ${y + 8} ${x} ${y} Z" fill="${UI_COLORS.pageDrawing}" stroke="${tint('accent', 'line')}" stroke-width="1.5"/><circle cx="${x + 17.5}" cy="${y}" r="3.5" fill="${tint('accent', 'strong')}"/>`;
    return {
      width: 220,
      height: 220,
      svg: svg(220, 220, [
        ...[18, 34, 50].map((r) => `<circle cx="60" cy="62" r="${r}" fill="none" stroke="${tint('spell', 'tint')}" stroke-width="1.5"/>`),
        `<path d="M205 200 C175 185 170 140 140 145 C120 148 122 172 140 168" stroke="${tint('accent', 'shade')}" stroke-width="7" stroke-linecap="round" fill="none"/>`,
        eye(140, 50), eye(25, 175),
      ].join('')),
    };
  },
  // Pixel: a checker of tiles, a heart and a coin.
  pixels: () => {
    const cells = [];
    for (let y = 0; y < 8; y += 1) {
      for (let x = (y % 2); x < 8; x += 2) cells.push(`<rect x="${x * 16}" y="${y * 16}" width="16" height="16" fill="${UI_COLORS.pageDrawing}"/>`);
    }
    return {
      width: 128,
      height: 128,
      svg: svg(128, 128, `<g shape-rendering="crispEdges">${cells.join('')}${sprite(10, 12, 4, ['.##.##.', '#######', '#######', '.#####.', '..###..', '...#...'], tint('danger', 'edge'))}${sprite(78, 74, 4, ['.####.', '######', '##..##', '##..##', '######', '.####.'], tint('warning', 'edge'))}</g>`),
    };
  },
});

// The kinds of page a style may lay besides the sticker paper and none.
export const PAGE_PATTERN_KINDS = Object.freeze(Object.keys(PATTERNS));

// A kind's tile, drawn in the palette's roles: { svg, width, height }.
export function pagePattern(kind) {
  return PATTERNS[kind]();
}
