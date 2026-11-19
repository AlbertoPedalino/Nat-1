import { BASE_STYLE_ID } from './shapes.js';

// The interface's font stacks, from one place. The theme's body text uses
// `body`; titles, labels and numbers use `display`, a sturdy, lightly
// softened face that gives the interface its voice; longer flavour text uses
// `prose`; formulas and code use `mono`.
//
// Each style (shapes.js SHAPE_STYLES) letters the interface in its own faces
// (FONT_STYLES: its stacks and the stylesheet that loads them), so a role is
// the chosen style's CSS variable (UI_FONTS.display is
// `var(--gb-font-display)`), written on the page's root (fontVariables). What
// reads no CSS (a canvas's font) takes the style's stacks (fontStacks).
const COMIC_FONTS = Object.freeze({
  display: '"Rubik", system-ui, sans-serif',
  // Descriptive text read as a rulebook's: a feature's or spell's
  // description, a toast's message, a quiet note.
  prose: '"Alegreya", Georgia, serif',
  // The name on a card (an action, a spell, an item, a feature): the
  // rulebook's small capitals.
  cardName: '"Alegreya SC", "Alegreya", Georgia, serif',
  // The text of the interface (row names, lists, fields), in the rulebook's
  // face like the descriptions.
  body: '"Alegreya", Georgia, serif',
  // Comic lettering with a fantasy cut (a narrow, heavy face with blackletter
  // serifs): the voice, what happens in the moment (a roll, NATURAL 20!, a
  // toast) and the numeral on the home page's die.
  shout: '"Germania One", "Rubik", system-ui, sans-serif',
  // The sign, lettered like a rulebook's heading (a readable blackletter):
  // the names of places and people (pages, panels, dialogs, tools, scenes,
  // characters) and the app's own name on the home page's cover.
  // TEXT_STYLES.shout and .heading say which is which.
  heading: '"Grenze Gotisch", "Germania One", Georgia, serif',
  mono: '"JetBrains Mono", ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace',
});

// The sci-fi faces: a console's lettering. Orbitron for the voice and the
// signs, Rajdhani for labels and names, Exo 2 for the text, a terminal mono.
const SCIFI_FONTS = Object.freeze({
  display: '"Rajdhani", "Exo 2", system-ui, sans-serif',
  prose: '"Exo 2", system-ui, sans-serif',
  cardName: '"Rajdhani", "Exo 2", system-ui, sans-serif',
  body: '"Exo 2", system-ui, sans-serif',
  shout: '"Orbitron", "Rajdhani", system-ui, sans-serif',
  heading: '"Orbitron", "Rajdhani", system-ui, sans-serif',
  mono: '"Share Tech Mono", ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace',
});

// The gothic faces: a haunted chronicle. Pirata One for the signs, Creepster
// dripping for the voice, Cinzel for labels, IM Fell for the old prose and
// the names, the comic's Alegreya kept for the interface's text.
const GOTHIC_FONTS = Object.freeze({
  display: '"Cinzel", Georgia, serif',
  prose: '"IM Fell English", Georgia, serif',
  cardName: '"IM Fell English SC", "IM Fell English", Georgia, serif',
  body: '"Alegreya", Georgia, serif',
  shout: '"Creepster", "Pirata One", Georgia, serif',
  heading: '"Pirata One", "IM Fell English SC", Georgia, serif',
  mono: '"JetBrains Mono", ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace',
});

// The war faces: a stencilled crate and a typed report. Black Ops One for
// the signs, Stardos Stencil for the voice, Oswald for labels and names,
// PT Serif for the text, a typewriter for the mono.
const WAR_FONTS = Object.freeze({
  display: '"Oswald", "Arial Narrow", sans-serif',
  prose: '"PT Serif", Georgia, serif',
  cardName: '"Oswald", "Arial Narrow", sans-serif',
  body: '"PT Serif", Georgia, serif',
  shout: '"Stardos Stencil", "Black Ops One", "Arial Narrow", sans-serif',
  heading: '"Black Ops One", "Stardos Stencil", "Arial Narrow", sans-serif',
  mono: '"Special Elite", "Courier New", monospace',
});

// The astral faces: a grimoire of the heavens. Cinzel Decorative for the
// signs, Uncial Antiqua for the voice, Marcellus for labels and names,
// Spectral for the text.
const ASTRAL_FONTS = Object.freeze({
  display: '"Marcellus", Georgia, serif',
  prose: '"Spectral", Georgia, serif',
  cardName: '"Spectral SC", "Spectral", Georgia, serif',
  body: '"Spectral", Georgia, serif',
  shout: '"Uncial Antiqua", "Cinzel Decorative", Georgia, serif',
  heading: '"Cinzel Decorative", "Marcellus", Georgia, serif',
  mono: '"JetBrains Mono", ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace',
});

// The pirate faces: a captain's log. Fondamento for the signs, Rum Raisin
// for the voice, Alegreya Sans SC for labels, IM Fell DW Pica for the old
// prose and the names, the comic's Alegreya for the text.
const PIRATE_FONTS = Object.freeze({
  display: '"Alegreya Sans SC", system-ui, sans-serif',
  prose: '"IM Fell DW Pica", Georgia, serif',
  cardName: '"IM Fell DW Pica SC", "IM Fell DW Pica", Georgia, serif',
  body: '"Alegreya", Georgia, serif',
  shout: '"Rum Raisin", "Fondamento", Georgia, serif',
  heading: '"Fondamento", "IM Fell DW Pica SC", Georgia, serif',
  mono: '"JetBrains Mono", ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace',
});

// The steampunk faces: a patent office. Playfair Display SC for the signs
// and the names, Abril Fatface's poster type for the voice, Roboto Slab for
// labels, Lora for the text, a typewriter for the mono. (Rye's metrics are
// broken: font-size-adjust draws it four times too large.)
const STEAMPUNK_FONTS = Object.freeze({
  display: '"Roboto Slab", Georgia, serif',
  prose: '"Lora", Georgia, serif',
  cardName: '"Playfair Display SC", Georgia, serif',
  body: '"Lora", Georgia, serif',
  shout: '"Abril Fatface", "Playfair Display SC", Georgia, serif',
  heading: '"Playfair Display SC", Georgia, serif',
  mono: '"Courier Prime", "Courier New", monospace',
});

// The dwarven faces: runes cut in stone. Metamorphous for the signs, New
// Rocker for the voice, Barlow Condensed for labels, Vollkorn for the text.
const DWARVEN_FONTS = Object.freeze({
  display: '"Barlow Condensed", "Arial Narrow", sans-serif',
  prose: '"Vollkorn", Georgia, serif',
  cardName: '"Vollkorn SC", "Vollkorn", Georgia, serif',
  body: '"Vollkorn", Georgia, serif',
  shout: '"New Rocker", "Metamorphous", Georgia, serif',
  heading: '"Metamorphous", "Vollkorn SC", Georgia, serif',
  mono: '"JetBrains Mono", ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace',
});

// The fey faces: a fairy tale's. Berkshire Swash for the signs, Henny Penny
// for the voice, Quicksand for labels, the comic's Alegreya for the text.
const FEY_FONTS = Object.freeze({
  display: '"Quicksand", system-ui, sans-serif',
  prose: '"Alegreya", Georgia, serif',
  cardName: '"Alegreya SC", "Alegreya", Georgia, serif',
  body: '"Alegreya", Georgia, serif',
  shout: '"Henny Penny", "Berkshire Swash", Georgia, serif',
  heading: '"Berkshire Swash", "Alegreya SC", Georgia, serif',
  mono: '"JetBrains Mono", ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace',
});

// The abyssal faces: a 1920s professor's case notes. Cormorant Unicase for the
// signs, Eater for the voice, Spectral SC for labels and names, Crimson Pro
// for the text, a typewriter for the mono.
const ABYSSAL_FONTS = Object.freeze({
  display: '"Spectral SC", Georgia, serif',
  prose: '"Crimson Pro", Georgia, serif',
  cardName: '"Spectral SC", Georgia, serif',
  body: '"Crimson Pro", Georgia, serif',
  shout: '"Eater", "Cormorant Unicase", Georgia, serif',
  heading: '"Cormorant Unicase", "Spectral SC", Georgia, serif',
  mono: '"Courier Prime", "Courier New", monospace',
});

// The pixel faces: an 8-bit screen. Press Start 2P for the signs and the
// voice, VT323 for labels and numbers, Pixelify Sans for the text,
// Silkscreen for the names.
const PIXEL_FONTS = Object.freeze({
  display: '"VT323", ui-monospace, monospace',
  prose: '"Pixelify Sans", system-ui, sans-serif',
  cardName: '"Silkscreen", "Pixelify Sans", system-ui, sans-serif',
  body: '"Pixelify Sans", system-ui, sans-serif',
  shout: '"Press Start 2P", "VT323", ui-monospace, monospace',
  heading: '"Press Start 2P", "VT323", ui-monospace, monospace',
  mono: '"VT323", ui-monospace, monospace',
});

// The cyberpunk faces: a megacity's signage. Tektur for the signs, Russo One
// for the voice and the big figures (a glitched face made an 8 a smudge),
// Chakra Petch for labels and names, Barlow for the text, IBM Plex Mono for
// the mono.
const CYBERPUNK_FONTS = Object.freeze({
  display: '"Chakra Petch", system-ui, sans-serif',
  prose: '"Barlow", system-ui, sans-serif',
  cardName: '"Chakra Petch", system-ui, sans-serif',
  body: '"Barlow", system-ui, sans-serif',
  shout: '"Russo One", "Tektur", system-ui, sans-serif',
  heading: '"Tektur", "Chakra Petch", system-ui, sans-serif',
  mono: '"IBM Plex Mono", ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace',
});

// The superhero faces: a newsstand comic's. Bangers, a comic's hand-lettered
// capitals, for the signs and the voice; Comic Neue, a letterer's balloon
// hand, for the text; the comic's Rubik for labels, numbers and a card's name
// (Bangers' lower case is as tall as its capitals, so the small names fitted
// to a lower case came out tiny).
const SUPERHERO_FONTS = Object.freeze({
  display: '"Rubik", system-ui, sans-serif',
  prose: '"Comic Neue", "Rubik", system-ui, sans-serif',
  cardName: '"Rubik", system-ui, sans-serif',
  body: '"Comic Neue", "Rubik", system-ui, sans-serif',
  shout: '"Bangers", "Rubik", system-ui, sans-serif',
  heading: '"Bangers", "Rubik", system-ui, sans-serif',
  mono: '"JetBrains Mono", ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace',
});

// The noir faces: a 1940s case file. Bebas Neue, a film poster's condensed
// capitals, for the signs and the voice; Oswald for labels, numbers and a
// card's name (an ability's short name too, STR: a typewriter face's small
// lower case, raised to the text's fit, ran far past its box); Libre
// Franklin, the period's newspaper gothic, for the text; a typewriter for the
// case notes (Courier Prime).
const NOIR_FONTS = Object.freeze({
  display: '"Oswald", "Libre Franklin", system-ui, sans-serif',
  prose: '"Courier Prime", "Courier New", monospace',
  cardName: '"Oswald", "Libre Franklin", system-ui, sans-serif',
  body: '"Libre Franklin", system-ui, sans-serif',
  shout: '"Bebas Neue", "Oswald", system-ui, sans-serif',
  heading: '"Bebas Neue", "Oswald", system-ui, sans-serif',
  mono: '"Courier Prime", ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace',
});

// How large each lettering is drawn against its size (CSS font-size-adjust),
// by role: the comic faces' own, which the sizes were chosen for. A style's
// faces are fitted to them (FONT_STYLES `fits`, over these), so a size reads
// the same in every style: a narrow or short face (a blackletter, a
// condensed sign) is drawn larger, a wide one smaller, where a label or a
// title has the room the comic's had. Every role a TEXT_STYLES treatment
// fits: `body` (the theme's text, Alegreya's short lower case raised),
// `prose` (descriptions and notes in the prose face: Alegreya's too, the
// same as the text's in the comic; a typewriter face, wide and short in its
// lower case, raised as Alegreya is, came out huge), `heading`, `figure` (and the tag on its chip), `caps` (the label's small
// capitals: a variable named …label breaks Emotion), `shout`, `cover`.
const COMIC_FITS = Object.freeze({
  body: 'ex-height 0.52',
  prose: 'ex-height 0.52',
  heading: 'ex-height 0.55',
  figure: 'cap-height 0.92',
  caps: 'none',
  shout: 'none',
  cover: 'none',
});

// Every style's faces: `stacks` (the same roles as COMIC_FONTS) and the
// `stylesheet` that loads them. The base style's is linked by index.html, so
// it is there at the first paint; another style's is linked when it is chosen.
export const FONT_STYLES = Object.freeze({
  comic: Object.freeze({
    stacks: COMIC_FONTS,
    stylesheet: 'https://fonts.googleapis.com/css2?family=Alegreya:ital,wght@0,400..900;1,400..900&family=Alegreya+SC:wght@700&family=Germania+One&family=Grenze+Gotisch:wght@700;900&family=Rubik:wght@400;500;600;700;800&display=swap',
  }),
  gothic: Object.freeze({
    stacks: GOTHIC_FONTS,
    fits: Object.freeze({ heading: 'ex-height 0.72' }),
    stylesheet: 'https://fonts.googleapis.com/css2?family=Alegreya:ital,wght@0,400..900;1,400..900&family=Cinzel:wght@500;700&family=Creepster&family=IM+Fell+English:ital@0;1&family=IM+Fell+English+SC&family=Pirata+One&display=swap',
  }),
  war: Object.freeze({
    stacks: WAR_FONTS,
    fits: Object.freeze({ heading: 'ex-height 0.5' }),
    stylesheet: 'https://fonts.googleapis.com/css2?family=Black+Ops+One&family=Oswald:wght@400;500;600;700&family=PT+Serif:ital,wght@0,400;0,700;1,400&family=Special+Elite&family=Stardos+Stencil:wght@400;700&display=swap',
  }),
  scifi: Object.freeze({
    stacks: SCIFI_FONTS,
    fits: Object.freeze({ heading: 'ex-height 0.5', caps: 'cap-height 0.7' }),
    stylesheet: 'https://fonts.googleapis.com/css2?family=Exo+2:ital,wght@0,400..800;1,400..800&family=Orbitron:wght@500;700;900&family=Rajdhani:wght@500;600;700&family=Share+Tech+Mono&display=swap',
  }),
  astral: Object.freeze({
    stacks: ASTRAL_FONTS,
    fits: Object.freeze({ body: 'ex-height 0.46', heading: 'ex-height 0.56', shout: 'cap-height 0.66', cover: 'ex-height 0.5' }),
    stylesheet: 'https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@700;900&family=Marcellus&family=Spectral:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Spectral+SC:wght@600&family=Uncial+Antiqua&display=swap',
  }),
  pirate: Object.freeze({
    stacks: PIRATE_FONTS,
    fits: Object.freeze({ heading: 'ex-height 0.52', caps: 'cap-height 0.7' }),
    stylesheet: 'https://fonts.googleapis.com/css2?family=Alegreya:ital,wght@0,400..900;1,400..900&family=Alegreya+Sans+SC:wght@500;700;800&family=Fondamento&family=IM+Fell+DW+Pica:ital@0;1&family=IM+Fell+DW+Pica+SC&family=Rum+Raisin&display=swap',
  }),
  steampunk: Object.freeze({
    stacks: STEAMPUNK_FONTS,
    fits: Object.freeze({ body: 'ex-height 0.49', heading: 'ex-height 0.47', shout: 'cap-height 0.64', cover: 'ex-height 0.41' }),
    stylesheet: 'https://fonts.googleapis.com/css2?family=Abril+Fatface&family=Courier+Prime&family=Lora:ital,wght@0,400..700;1,400..700&family=Playfair+Display+SC:wght@700;900&family=Roboto+Slab:wght@400..800&display=swap',
  }),
  dwarven: Object.freeze({
    stacks: DWARVEN_FONTS,
    fits: Object.freeze({ body: 'ex-height 0.46', heading: 'ex-height 0.52', caps: 'cap-height 0.78', cover: 'ex-height 0.45' }),
    stylesheet: 'https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700;800&family=Metamorphous&family=New+Rocker&family=Vollkorn:ital,wght@0,400..900;1,400..900&family=Vollkorn+SC:wght@600;700&display=swap',
  }),
  fey: Object.freeze({
    stacks: FEY_FONTS,
    fits: Object.freeze({ shout: 'cap-height 0.74' }),
    stylesheet: 'https://fonts.googleapis.com/css2?family=Alegreya:ital,wght@0,400..900;1,400..900&family=Alegreya+SC:wght@700&family=Berkshire+Swash&family=Henny+Penny&family=Quicksand:wght@400..700&display=swap',
  }),
  abyssal: Object.freeze({
    stacks: ABYSSAL_FONTS,
    fits: Object.freeze({ body: 'ex-height 0.46', heading: 'ex-height 0.41', shout: 'cap-height 0.62' }),
    stylesheet: 'https://fonts.googleapis.com/css2?family=Cormorant+Unicase:wght@600;700&family=Courier+Prime&family=Crimson+Pro:ital,wght@0,400..800;1,400..800&family=Eater&family=Spectral+SC:wght@500;700&display=swap',
  }),
  pixel: Object.freeze({
    stacks: PIXEL_FONTS,
    fits: Object.freeze({ body: 'ex-height 0.45', heading: 'ex-height 0.42', shout: 'cap-height 0.5', caps: 'cap-height 0.82', cover: 'ex-height 0.36' }),
    stylesheet: 'https://fonts.googleapis.com/css2?family=Pixelify+Sans:wght@400..700&family=Press+Start+2P&family=Silkscreen:wght@400;700&family=VT323&display=swap',
  }),
  cyberpunk: Object.freeze({
    stacks: CYBERPUNK_FONTS,
    fits: Object.freeze({ heading: 'ex-height 0.5', shout: 'cap-height 0.62', cover: 'ex-height 0.47' }),
    stylesheet: 'https://fonts.googleapis.com/css2?family=Barlow:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Chakra+Petch:wght@500;600;700&family=IBM+Plex+Mono:wght@400;600&family=Russo+One&family=Tektur:wght@500;700&display=swap',
  }),
  superhero: Object.freeze({
    stacks: SUPERHERO_FONTS,
    // Bangers is all capitals and narrow: lettered by them, a little taller
    // than the comic's, so a short name (Int, Str) still reads.
    fits: Object.freeze({ heading: 'cap-height 0.77' }),
    stylesheet: 'https://fonts.googleapis.com/css2?family=Bangers&family=Comic+Neue:ital,wght@0,400;0,700;1,400&display=swap',
  }),
  noir: Object.freeze({
    stacks: NOIR_FONTS,
    // Bebas Neue is all capitals and condensed, as Bangers is: lettered by
    // them. Courier Prime, a typewriter's, is wide: its notes drawn at its
    // own lower case, a little under the text's, so a description reads at
    // the length the comic's did.
    fits: Object.freeze({ heading: 'cap-height 0.77', prose: 'ex-height 0.4' }),
    stylesheet: 'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Courier+Prime:ital,wght@0,400;0,700;1,400&family=Libre+Franklin:wght@400..700&family=Oswald:wght@400..700&display=swap',
  }),
});

function fontStyle(styleId) {
  return FONT_STYLES[styleId] || FONT_STYLES[BASE_STYLE_ID];
}

const fontVariableName = (role) => `--gb-font-${role.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`;

export const UI_FONTS = Object.freeze(Object.fromEntries(
  Object.keys(COMIC_FONTS).map((role) => [role, `var(${fontVariableName(role)})`]),
));

// A style's stacks by role, for a canvas.
export function fontStacks(styleId) {
  return fontStyle(styleId).stacks;
}

// The stylesheet a style's faces are loaded from.
export function fontStylesheet(styleId) {
  return fontStyle(styleId).stylesheet;
}

// A lettering role's fit as the chosen style's CSS variable (COMIC_FITS).
const fitVariableName = (role) => `--gb-${role}-size-fit`;
export const FONT_FITS = Object.freeze(Object.fromEntries(
  Object.keys(COMIC_FITS).map((role) => [role, `var(${fitVariableName(role)})`]),
));

// The variables a style fills, { '--gb-font-display': '"Rubik", …', … }: its
// stacks and its fits.
export function fontVariables(styleId) {
  const own = fontStyle(styleId).fits || {};
  // The prose is fitted as the text is unless the style fits it apart.
  const fits = { ...COMIC_FITS, ...own, prose: own.prose ?? own.body ?? COMIC_FITS.prose };
  return {
    ...Object.fromEntries(Object.entries(fontStacks(styleId)).map(([role, stack]) => [fontVariableName(role), stack])),
    ...Object.fromEntries(Object.entries(fits).map(([role, fit]) => [fitVariableName(role), fit])),
  };
}

// The type scale. Every font size in the interface is one of these steps, so a
// restyle changes the scale here. The sheet and builder are dense, hence the
// many small steps (8–14px); `body` and above are titles and headings. Sizes
// that follow a piece's own box (cqmin clamps on map tokens) or the parent
// text (em) are geometry, not type, and stay where they are drawn.
export const FONT_SIZES = Object.freeze({
  micro: '0.45rem',
  xxxs: '0.5rem',
  xxs: '0.56rem',
  xs: '0.62rem',
  sm: '0.66rem',
  md: '0.72rem',
  lg: '0.76rem',
  xl: '0.82rem',
  xxl: '0.875rem',
  body: '1rem',
  lead: '1.1rem',
  title: '1.25rem',
  heading: '1.5rem',
  display: '1.75rem',
  hero: '2rem',
});

// The two sizes of a control's label (buttons, tabs, keys, clickable chips):
// `normal` everywhere, `small` in a dense row of filters or tags.
export const CONTROL_FONT_SIZES = Object.freeze({
  normal: FONT_SIZES.sm,
  small: FONT_SIZES.xxs,
});

// Letter spacing of spaced-out text (uppercase labels and captions), in
// steps like the type scale. Ordinary text keeps the font's own spacing.
export const LETTER_SPACINGS = Object.freeze({
  sm: '0.04em',
  md: '0.06em',
  lg: '0.08em',
  xl: '0.1em',
  xxl: '0.12em',
});

// Font weights. Rubik and Alegreya draw regular to heavy; `black` is the
// heading face's heaviest cut, for the app's name on the home cover.
export const FONT_WEIGHTS = Object.freeze({
  regular: 400,
  semibold: 600,
  bold: 700,
  heavy: 800,
  black: 900,
});

// Line heights: `none` for figures and one-line chips, `tight`–`snug` for
// dense rows and labels, `normal` for body text, `relaxed` for prose.
export const LINE_HEIGHTS = Object.freeze({
  none: 1,
  tight: 1.15,
  snug: 1.25,
  normal: 1.4,
  relaxed: 1.6,
});

// Links a style's faces once (the base style's are linked by index.html).
export function linkStyleFonts(styleId) {
  const href = fontStylesheet(styleId);
  const links = [...document.querySelectorAll('link[rel="stylesheet"]')];
  if (!href || links.some((link) => link.getAttribute('href') === href)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
}
