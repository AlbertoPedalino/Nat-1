import { LETTERING_FILL, UI_COLORS, uiAlpha, OPACITY } from './colors.js';

// The ink of the chosen style (shapes.js `ink`, written as `--gb-ink-*` on the
// page's root): every length below is the comic one times the style's share,
// so a style can ink thicker or thinner (`line`: every inked line follows the
// edge), drop its solid shadows further or not at all (`drop`), and float its
// surfaces higher or lower (`depth`). In px, as lengths of the comic cut.
export const INK_WIDTH = 'var(--gb-ink-edge)';
export const inkLine = (px) => `calc(${px}px * var(--gb-ink-line))`;
const drop = (px) => `calc(${px}px * var(--gb-ink-drop))`;
const depth = (px) => `calc(${px}px * var(--gb-ink-depth))`;
// How far a solid shadow blurs out: none in a drawn style, a lit line's halo
// in a glowing one (shapes.js ink.glow).
const GLOW = 'var(--gb-ink-glow)';

// The drop shadows of surfaces that sit above the page, one per height, so a
// restyle changes depth in one place. Glows and focus rings stay with the
// accent they echo; shadows under map pieces and dice are drawn with them.
// A solid shadow set off to the lower right, in ink or in a moment's colour:
// the comic panel's and the speech bubble's.
export function inkShadow(color = UI_COLORS.edge, offset = 3) {
  return `${drop(offset)} ${drop(offset)} ${GLOW} ${color}`;
}

// The same solid shadow under a shape cut out of its box (a crest, a
// pennant), where a box-shadow would stay square: a drop-shadow filter, which
// follows the cut. A filter is a layer of its own, so only for a handful of
// shapes on a screen, never for a list.
export function inkCutShadow(offset = 3, color = UI_COLORS.edge) {
  return `drop-shadow(${drop(offset)} ${drop(offset)} ${GLOW} ${color})`;
}

// The ink edge: the line round every drawn box and control (2px in the comic
// style). A frame that is not a whole surface (a pill, a stepper, a tile)
// takes this; a bolder one (a speech bubble's) is inkEdge(3), a line `px` wide
// in the comic cut.
export const INK_EDGE = `${INK_WIDTH} solid ${UI_COLORS.edge}`;

// The ink line's width and style alone, its colour set apart (a frame in a
// tone: `border: INK_SOLID, borderColor: tone`).
export const INK_SOLID = `${INK_WIDTH} solid`;

export function inkEdge(px, color = UI_COLORS.edge) {
  return `${inkLine(px)} solid ${color}`;
}

// A piece laid on the board (a character's token): an ink outline round it
// and its solid shadow under it, so it reads as a cut-out set down on the
// map. Lengths are CSS (they can follow the piece's size: cqmin); `around` is
// what already rings the piece (a turn ring) for the ink to sit outside. On
// the map the shadow is the ink at half strength, so it reads as a shadow on
// the board and never hides the name under the piece; `solid` draws it full,
// as a panel's, for the same piece shown on the dark interface.
export function inkPieceShadow({ outline = INK_WIDTH, drop: fall = '3px', around = '0px', solid = false } = {}) {
  const spread = `calc(${around} + ${outline})`;
  const shade = solid ? UI_COLORS.edge : uiAlpha(UI_COLORS.edge, OPACITY.strong);
  const offset = `calc(${fall} * var(--gb-ink-drop))`;
  return `0 0 0 ${spread} ${UI_COLORS.edge}, ${offset} ${offset} 0 ${around} ${shade}`;
}

// Inked lettering: a hard shadow under a title, a big number, a die's numeral.
export function inkTextShadow(color = UI_COLORS.edge) {
  return `${drop(1)} ${drop(1)} ${GLOW} ${color}`;
}

// Comic lettering inked: an ink outline `width` thick round the letters, under
// the fill so they keep their full weight, and their solid shadow `offset`
// off. The one recipe for outlined lettering (TEXT_STYLES' shout, figure and
// cover). The shadow is a text-shadow, which every engine paints with the
// text itself. Apple's WebKit (Safari, every browser on iOS) drops the
// text-shadow of text drawn with a stroke, and only the outline showed: there
// it is a drop-shadow filter instead. Only there: a filter on each of the
// screen's dozens of headings and figures is a layer of its own, repainted on
// every scroll, and made a desktop's large window stutter.
export const APPLE_WEBKIT_QUERY = '@supports (font: -apple-system-body)';

//
// Outline and shadow are the ink, or `color` when given; the letters are
// filled and their shadow dropped as the palette letters (colors.js
// LETTERINGS: on a light palette dark neutral letters are lifted to a light
// tone, a tone's colour kept, and no shadow falls).
export function inkLettering(width, offset, color = UI_COLORS.edge) {
  // The shadow falls as far as the palette drops lettering's (a light one: none).
  const fall = `calc(${drop(offset)} * var(--gb-lettering-drop))`;
  return {
    WebkitTextFillColor: LETTERING_FILL,
    WebkitTextStroke: `${inkLine(width)} ${color}`,
    paintOrder: 'stroke fill',
    textShadow: `${fall} ${fall} ${GLOW} ${color}`,
    [APPLE_WEBKIT_QUERY]: {
      textShadow: 'none',
      filter: `drop-shadow(${fall} ${fall} ${GLOW} ${color})`,
    },
  };
}

// An ink outline drawn round a silhouette (an icon drawn large, as the AC
// shield) as a CSS filter, with the solid shadow under it in `shadow`.
export function inkOutlineFilter(color = UI_COLORS.edge, shadow = color) {
  const edge = (x, y) => `drop-shadow(${x ? inkLine(x) : 0} ${y ? inkLine(y) : 0} 0 ${color})`;
  return `${edge(1.5, 0)} ${edge(-1.5, 0)} ${edge(0, 1.5)} ${edge(0, -1.5)} drop-shadow(${drop(2)} ${drop(2)} ${GLOW} ${shadow})`;
}

export const UI_SHADOWS = Object.freeze({
  // A bar resting on the page (the battle map's scene bar).
  raised: `0 ${depth(8)} ${depth(24)} ${uiAlpha(UI_COLORS.black, OPACITY.shade)}`,
  // Floating controls and notices: toasts, the dice dock, map hints, strips.
  float: `0 ${depth(6)} ${depth(20)} ${uiAlpha(UI_COLORS.black, OPACITY.strong)}`,
  // Pop-ups over the content: roll bubbles, the dice toast.
  popup: `0 ${depth(8)} ${depth(28)} ${uiAlpha(UI_COLORS.black, OPACITY.strong)}`,
  // Under what can be pressed (a filled button): a solid ink edge, the drawn
  // look's depth; `pressed` is the same button pushed down.
  press: `0 ${drop(2)} ${GLOW} ${UI_COLORS.edge}`,
  pressed: `0 ${drop(1)} ${GLOW} ${UI_COLORS.edge}`,
  // The same button lifted under the cursor.
  lifted: `0 ${drop(3)} ${GLOW} ${UI_COLORS.edge}`,
  // The comic panel's solid shadow, set off to the lower right: a main panel
  // (`panel`) and a box on the page (`box`).
  panel: inkShadow(),
  box: inkShadow(UI_COLORS.edge, 2),
  // Inked lettering: a hard shadow under titles and big numbers.
  inkText: inkTextShadow(),
  // Dialogs and floating panels.
  overlay: `0 ${depth(18)} ${depth(52)} ${uiAlpha(UI_COLORS.black, OPACITY.strong)}`,
});
