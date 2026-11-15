import { hexChannels } from './colors.js';
import { publicAsset } from '../publicAsset.js';

// The pages' scenes: an illustration laid behind every screen of a style
// (shapes.js surface.paper), in place of a texture, laid by the theme
// (theme.js). Two kinds. An inked scene is a 1-bit picture
// (white lines on black), kept here as its PNG, recoloured per palette by an
// SVG filter (sceneSvg): the black the page, the white a shade towards its
// lettering's colour on a dark palette, towards the ink on a light one, at
// LINE_SHARE (a backdrop, never as loud as the panels on it). Each repeats
// side by side without a seam, so its `frame` (x, y in its own pixels) moves
// what is seen: the graveyard's bell tower to the right, lower, clear of the
// titles; `tallFrame` on a screen taller than wide (a phone), where only the
// middle of the picture shows: the church in the middle.
//
// A painted scene keeps its own colours: one picture per mode (public/scenes),
// under a veil of the page's colour (VEIL) so it stays behind the panels;
// `pixelated` keeps a pixel-art picture's pixels sharp.
//
// From CraftPix.net's free assets (craftpix.net, free asset licence: used in
// the app, never offered as a file of its own; credited in README.md): the
// graveyard ("Free 1-bit Graveyard Pixel Art Backgrounds"), the megacity
// ("Free Futuristic City Pixel Art Backgrounds"), the tropics ("Free Beach 2D
// Game Backgrounds"), the ruins ("Free War Pixel Art 2D Backgrounds"), the
// planets ("Free Planets in Space Pixel Game Background Pack"), the moonrise
// ("Free Moon Pixel Game Backgrounds"), the foundries ("Free Steampunk
// Cityscape Pixel Backgrounds"), the caverns ("Free Crystal Cave Pixel Art
// Backgrounds"), the enchanted wood ("Forest and Trees Free Pixel
// Backgrounds"), the sky beyond ("Free Moon Pixel Game Backgrounds", "Free
// Nature Backgrounds Pixel Art"), the wilds
// ("4 Free Seamless Nature Pixel Backgrounds").

const GRAVEYARD_PNG = 'data:image/png;base64,'
  + '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';

const SCENES = Object.freeze({
  graveyard: Object.freeze({
    inked: true, png: GRAVEYARD_PNG, width: 576, height: 324, frame: Object.freeze([-160, -60]), tallFrame: Object.freeze([58, -60]),
  }),
  // Cyberpunk: neon towers by night, a sunlit district by day.
  megacity: Object.freeze({ pictures: Object.freeze({ dark: 'megacity-night.png', light: 'megacity-day.png' }), pixelated: true }),
  // Pirate: palms against a sunset at sea, an island and a sail by day.
  tropics: Object.freeze({ pictures: Object.freeze({ dark: 'tropics-sunset.webp', light: 'tropics-island.webp' }), pixelated: false }),
  // War: a ruined town under the moon, in a yellow haze by day.
  ruins: Object.freeze({ pictures: Object.freeze({ dark: 'ruins-night.webp', light: 'ruins-day.webp' }), pixelated: false }),
  // Sci-fi: a gas giant, an ice giant.
  planets: Object.freeze({ pictures: Object.freeze({ dark: 'planets-jupiter.png', light: 'planets-uranus.png' }), pixelated: true }),
  // Astral: a golden moon over the forest, a pale one over the clouds.
  moonrise: Object.freeze({ pictures: Object.freeze({ dark: 'moonrise-forest.png', light: 'moonrise-clouds.png' }), pixelated: true }),
  // Steampunk: foundries lit at night, an airship over the city by day.
  foundries: Object.freeze({ pictures: Object.freeze({ dark: 'foundries-night.png', light: 'foundries-airship.png' }), pixelated: true }),
  // Dwarven: a crystal cavern in the dark, one opening on the day.
  caverns: Object.freeze({ pictures: Object.freeze({ dark: 'caverns-deep.png', light: 'caverns-open.png' }), pixelated: true }),
  // Fey: a wood in blue twilight, an old oak under a pastel sky.
  enchanted: Object.freeze({ pictures: Object.freeze({ dark: 'enchanted-twilight.png', light: 'enchanted-oak.png' }), pixelated: true }),
  // Cosmic: a blood moon through dead branches, an alien aurora over the peaks.
  beyond: Object.freeze({ pictures: Object.freeze({ dark: 'beyond-bloodmoon.png', light: 'beyond-aurora.png' }), pixelated: true }),
  // Pixel: a tree at dusk, a snowy peak.
  wilds: Object.freeze({ pictures: Object.freeze({ dark: 'wilds-dusk.png', light: 'wilds-peak.png' }), pixelated: true }),
});

export const PAGE_SCENE_KINDS = Object.freeze(Object.keys(SCENES));

// The page's colour over a painted scene, as an opacity step (colors.js
// OPACITY): enough to quiet it behind the panels.
export const VEIL = 'strong';

// A scene: { inked, pixelated } and, painted, its picture's URL for `mode`.
export function pageScene(kind, mode) {
  const scene = SCENES[kind];
  return {
    inked: Boolean(scene.inked),
    pixelated: scene.inked || scene.pixelated,
    picture: scene.pictures ? publicAsset(`scenes/${scene.pictures[mode]}`) : null,
  };
}

// Every painted scene's files, for what checks they ship.
export const SCENE_PICTURES = Object.freeze(Object.values(SCENES).flatMap((scene) => Object.values(scene.pictures || {})));

// How far a scene's lines go from the page towards the lettering (dark) or
// the ink (light).
export const LINE_SHARE = Object.freeze({ dark: 0.38, light: 0.32 });

const channels = (hex) => hexChannels(hex).map((value) => value / 255);

// A scene drawn in two hexes: `ground` for its black, its white `share` of the
// way from `ground` to `towards`, its pixels kept sharp however large it is
// laid, framed as the scene frames itself (`tall`: its tallFrame).
export function sceneSvg(kind, ground, towards, share, { tall = false } = {}) {
  const { png, width, height, frame, tallFrame } = SCENES[kind];
  const [x, y] = tall && tallFrame ? tallFrame : frame;
  const from = channels(ground);
  const to = channels(towards).map((value, index) => from[index] + (value - from[index]) * share);
  const table = (index) => `tableValues="${from[index].toFixed(3)} ${to[index].toFixed(3)}"`;
  // Copies side by side, so the frame never runs off the picture.
  const copies = [-width, 0, width].map((at) => `<image x="${at}" href="${png}" width="${width}" height="${height}" filter="url(#ink)" style="image-rendering:pixelated"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${width} ${height}" preserveAspectRatio="xMidYMax slice">`
    + '<filter id="ink" color-interpolation-filters="sRGB"><feComponentTransfer>'
    + `<feFuncR type="table" ${table(0)}/><feFuncG type="table" ${table(1)}/><feFuncB type="table" ${table(2)}/>`
    + `</feComponentTransfer></filter><rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${ground}"/>${copies}</svg>`;
}
