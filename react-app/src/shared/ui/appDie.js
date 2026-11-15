// The app's d20: the inked, cel-shaded die of the logo (the home cover's
// NatOneDie, the browser tab's icon, the busy die), drawn in a 512 box. Its
// corners, its outline, its faces in the shades of a dice set's logo ramp
// (diceSets.js) lit from the top left, and the 1 it lands on.
export const APP_DIE_POINTS = Object.freeze({
  Top: [256, 36], UR: [450, 148], LR: [450, 372], Bot: [256, 484], LL: [62, 372], UL: [62, 148],
  T: [256, 140], L: [150, 322], R: [362, 322],
});

export const APP_DIE_OUTLINE = Object.freeze(['Top', 'UR', 'LR', 'Bot', 'LL', 'UL']);

export const APP_DIE_FACES = Object.freeze([
  [['Top', 'UL', 'T'], 'light'],
  [['Top', 'T', 'UR'], 'midLight'],
  [['UL', 'L', 'T'], 'midLight'],
  [['UR', 'T', 'R'], 'midDark'],
  [['UL', 'LL', 'L'], 'mid'],
  [['UR', 'R', 'LR'], 'dark'],
  [['LL', 'Bot', 'L'], 'midDark'],
  [['L', 'Bot', 'R'], 'dark'],
  [['R', 'Bot', 'LR'], 'darkest'],
  [['T', 'L', 'R'], 'mid'],
]);

export const appDiePoints = (names) => names.map((name) => APP_DIE_POINTS[name].join(',')).join(' ');

// The numeral 1 the icon shows, drawn as a path (an icon has no faces to
// letter it in).
const ONE = 'M 232 214 L 268 190 L 286 190 L 281 290 L 300 290 L 298 318 L 222 318 L 224 290 L 246 290 L 249 236 L 236 243 Z';

// The icon as an SVG: the die in a set's logo ramp (`colors`), edged in
// `ink`, showing its 1. What public/favicon.svg draws in the comic set.
export function appDieSvg(colors, ink) {
  const outline = appDiePoints(APP_DIE_OUTLINE);
  const faces = APP_DIE_FACES.map(([face, shade]) => (
    `<polygon points="${appDiePoints(face)}" fill="${colors[shade]}" stroke="${ink}" stroke-width="16" stroke-linejoin="round"/>`
  )).join('');
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 14 512 512">'
    + `<polygon points="${outline}" fill="${ink}" stroke="${ink}" stroke-width="30" stroke-linejoin="round" transform="translate(16 16)"/>`
    + faces
    + `<polygon points="${outline}" fill="none" stroke="${ink}" stroke-width="30" stroke-linejoin="round"/>`
    + `<path d="${ONE}" fill="${colors.numeral}" stroke="${ink}" stroke-width="14" stroke-linejoin="round" paint-order="stroke fill" transform="rotate(-6 260 254) translate(260 254) scale(1.3) translate(-260 -254)"/></svg>`;
}
