import { Box } from '@mui/material';
import CoinFace from './CoinFace.jsx';
import { faceValues, tumbleTurns } from './dice3d.js';
import { dieGeometry } from './polyhedra.js';
import { clamp } from '../../numbers.js';
import { TEXT_STYLES } from '../../ui/textStyles.js';
import { OPACITY, UI_COLORS, uiAlpha, uiMix } from '../../ui/colors.js';
import { LINE_HEIGHTS } from '../../ui/fonts.js';
import { APPLE_WEBKIT_QUERY, inkTextShadow } from '../../ui/shadows.js';

// A die that was thrown, rather than a number in a box: the real solid for its
// number of sides, tumbling and coming to rest with the rolled face towards you.
//
// The animation is decoration over a result that was already decided. It is
// seeded so a re-render does not re-throw the die, and it is skipped for anyone
// who asked for less motion. It only plays on mount, so a component that wants
// the throw shown again has to give it a new React key.
//
// `spin={false}` hands the solid over to a caller that drives the rotation
// itself — the map, where the dice are stepped through a physics simulation
// rather than a CSS keyframe.

export default function Die3D({
  value,
  faces,
  color,
  dimmed = false,
  seed,
  size = 26,
  spinMs = 620,
  turns = 1,
  spin = true,
  solidRef,
  numbering,
  landing,
  solid = false,
}) {
  const geometry = dieGeometry(faces, size / 2);
  // A die thrown on the map is numbered like a real one and lands on whichever
  // face the throw left on top, so the caller says which. A die standing for a
  // number that was already rolled simply wears it on the face that faces out.
  const landed = landing ?? geometry.landing;
  const values = numbering || faceValues(geometry.faces.length, value, faces, seed, landed);
  const tumble = tumbleTurns(seed);

  // A hundred-faced die is a hundred planes, each composited on its own.
  // That is worth paying for where the die is the point — rolling across the
  // table — and nowhere else: a roll log holding forty of them brought the whole
  // page down. Anywhere the die is only standing for a number it already knows,
  // a crowded solid is drawn as the single face it landed on, which the geometry
  // has already turned to face the reader.
  const crowded = geometry.faces.length > CROWDED_FACES;
  const flat = crowded && !solid;
  const drawn = flat ? [geometry.faces[landed]] : geometry.faces;
  const spinning = spin && !flat;
  // A die the mode threw away settles in half the time, turning half as far:
  // the eye follows the die that counts, and two whole solids tumbling side
  // by side for the full throw made the toast stutter.
  const spinShare = dimmed ? DROPPED_SPIN_SHARE : 1;

  // One size for every number on the die, taken from the longest of them and
  // from the least room any face has. Sizing each number to its own width made
  // a 7 half again as big as a 17 on the same die, which no real die does.
  const room = Math.min(...geometry.faces.map((face) => face.room || 0.15));
  const digits = values.reduce((longest, value) => Math.max(longest, String(value).length), 1);
  const glyph = numberSize(size, room, digits);

  return (
    // A die the mode threw away is greyed by its own colours, never by an
    // opacity: on the solid a translucent preserve-3d element is drawn flat (it
    // tumbled as a picture), and on the scene round it the whole 3D group is
    // redrawn every frame of the throw.
    <Box sx={{ ...sceneSx, width: size, height: size }}>
      <Box
        ref={solidRef}
        sx={{
          ...solidSx,
          width: size,
          height: size,
          ...(spinning ? {
            animationName: 'gbDieTumble',
            animationDuration: `${spinMs * spinShare}ms`,
            animationDelay: `${tumble.delayMs}ms`,
            '--gb-die-x': `${-tumble.x * turns * spinShare}deg`,
            '--gb-die-y': `${-tumble.y * turns * spinShare}deg`,
          } : null),
        }}
      >
        {drawn.map((face, offset) => {
          const index = flat ? landed : offset;
          return (
            <Box
              key={index}
              sx={{
                ...faceSx,
                width: size,
                height: size,
                fontSize: glyph,
                lineHeight: LINE_HEIGHTS.none,
                // A face is either a polygon drawn as a picture (facePicture),
                // or — on a coin — a disc the browser rounds off for us.
                ...(face.corners ? {
                  bgcolor: 'transparent',
                  backgroundImage: facePicture(face.corners, faceTint(face, dimmed)),
                  backgroundSize: '100% 100%',
                } : { borderRadius: face.borderRadius }),
                transform: face.transform,
                // Only the face that landed carries the result's colour — red
                // for a 1, gold for the top of the die — and the rest are
                // scenery that must not shout "natural 20" at you.
                color: index === landed && !dimmed ? color : OTHER_FACE_INK,
              }}
            >
              {face.corners ? null : (
                <Box sx={{ ...faceFillSx, borderRadius: face.borderRadius, bgcolor: faceTint(face, dimmed) }} />
              )}
              {/* A coin is struck, not numbered: the two sides carry a head and
                  a cross, and the 1 and 2 behind them are only what the total is
                  made of. */}
              {geometry.shape === 2 ? (
                <CoinFace kind={values[index] === 2 ? 'tails' : 'heads'} size={size * 0.56} />
              ) : null}
              {geometry.shape !== 2 ? (
                <Box component="span" sx={digits > 1 ? narrowNumberSx : numberSx}>{values[index]}</Box>
              ) : null}
            </Box>
          );
        })}

        {/* The band round the edge of a coin: no number, no result, just the
            side of the thing so it does not vanish when it turns edge-on. */}
        {(geometry.rim || []).map((panel, index) => (
          <Box
            key={`rim-${index}`}
            sx={{
              ...rimSx,
              width: panel.width,
              height: panel.height,
              marginLeft: `${-panel.width / 2}px`,
              marginTop: `${-panel.height / 2}px`,
              transform: panel.transform,
            }}
          />
        ))}
      </Box>
    </Box>
  );
}

// A number as large as its face can hold, by the same rule on every die: the
// box around the numeral fits the face's incircle. The old rule let a single
// digit overflow the circle by a sixth and capped it at almost half the die,
// so a d4 or d8 wore a number twice the size of a d20's beside it.
function numberSize(size, room, characters) {
  const across = size * (room || 0.15) * 2;
  // A numeral's box, in ems: about 0.6 wide a digit (less when narrowed) and
  // 0.72 tall. Its diagonal is what has to fit across the circle.
  const width = (DIGIT_WIDTH * characters) - (DIGIT_TIGHTEN * (characters - 1)) + 0.1;
  const fit = across / Math.hypot(width, DIGIT_HEIGHT);
  // The floor follows the face rather than being a flat legibility minimum: on
  // a hundred-sided die a 7px numeral is wider than the triangle holding it, so
  // it came out clipped in half. A blur of tiny numerals is what a d100 looks
  // like anyway, and it beats a die with blank faces.
  const floor = clamp(Math.round(across * 0.8), 3, 7);

  // Capped so a d6, whose faces are nearly all room, does not end up with a
  // number bigger than the die reads as.
  return Math.max(floor, Math.round(Math.min(size * 0.36, fit)));
}

const DIGIT_WIDTH = 0.6;
const DIGIT_HEIGHT = 0.72;
// Two digits are set closer together, as they are printed on a real d10 or
// d20, so they can stand taller on a face that has no room sideways. Tightened
// with letter-spacing, not a scaleX transform: a transform on every numeral of
// every face of a tumbling solid made desktop rolls noticeably heavier. The
// browser adds the spacing after the last digit too, so the padding gives it
// back and the number stays centred.
const DIGIT_TIGHTEN = 0.12;

// The numbers are inked too: a hard shadow under the cream, as a comic letters.
const NUMBER_INK = inkTextShadow(UI_COLORS.dieEdge);
const numberSx = { position: 'relative', textShadow: NUMBER_INK };
const narrowNumberSx = { position: 'relative', textShadow: NUMBER_INK, letterSpacing: `${-DIGIT_TIGHTEN}em`, paddingRight: `${DIGIT_TIGHTEN}em` };

// Past this many faces a die is too busy to draw in full anywhere it is not the
// thing being watched, and its numbers are smaller than a legible glyph.
const CROWDED_FACES = 24;

// How much of the throw a die the mode threw away spends tumbling.
const DROPPED_SPIN_SHARE = 0.5;

const sceneSx = {
  perspective: '600px',
  flex: '0 0 auto',
  position: 'relative',
};

const solidSx = {
  position: 'absolute',
  inset: 0,
  transformStyle: 'preserve-3d',
  animationTimingFunction: 'cubic-bezier(0.16, 0.86, 0.24, 1)',
  animationFillMode: 'backwards',
  '@keyframes gbDieTumble': {
    from: { transform: 'rotateX(var(--gb-die-x)) rotateY(var(--gb-die-y))' },
    to: { transform: 'rotateX(0deg) rotateY(0deg)' },
  },
  '@media (prefers-reduced-motion: reduce)': {
    animationName: 'none',
  },
};

// Each face is painted a little differently by how it sits on the solid, which
// is what stops an icosahedron from reading as a green blob when it turns.
//
// Shaded the way the app's icon is: the face towards you stays deep green so
// its cream number stands out, the ring of faces around it catches the light,
// and the faces turning away fall back to dark.
//
// A die the mode threw away keeps its shape but loses its colour: it is still
// shown, because seeing what advantage saved you from is half of why advantage
// is fun. The coin is painted like the dice.
//
// Drawn like a cartoon: flat bands instead of a smooth gradient — the face
// towards you, the lit ring round it, and the faces turning away in shadow.
function faceTint(face, dimmed) {
  const lit = Math.max(0, face.towardsViewer);
  if (dimmed) return uiMix(UI_COLORS.surfaceHeader, UI_COLORS.surfaceRaised, lit);
  if (lit >= 0.9) return UI_COLORS.dieFace;
  if (lit >= 0.4) return UI_COLORS.dieFaceLit;
  return uiMix(UI_COLORS.dieFace, UI_COLORS.dieEdge, 0.4);
}

// The numbers on the faces that did not land: cream like the result, but
// quieter, so the eye goes to the face that counts.
const OTHER_FACE_INK = uiAlpha(UI_COLORS.onDie, OPACITY.strong);

const faceSx = {
  position: 'absolute',
  left: 0,
  top: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  // The rim: ink showing around the face, so every edge on the solid is drawn
  // without a border the clip would have eaten — the die's comic outline.
  // Opaque, or the board shows through the die and it reads as glass rather
  // than as a solid thing.
  bgcolor: UI_COLORS.dieEdge,
  ...TEXT_STYLES.figure,
  // No lettering shadow as a filter here: it would be one more filter on
  // every face of a tumbling solid (and would shadow the face itself). The
  // numbers keep their own text-shadow (numberSx).
  textShadow: 'none',
  [APPLE_WEBKIT_QUERY]: { filter: 'none' },
  backfaceVisibility: 'hidden',
};

// A panel of the band round a coin's edge. It carries no number and cannot be
// a result, so it needs no clip and no fill of its own — it is the side of the
// thing, and it is sized rather than cut out.
const rimSx = {
  position: 'absolute',
  left: '50%',
  top: '50%',
  // The coin's side, in the lighter green of the dice.
  bgcolor: UI_COLORS.dieFaceLit,
  backfaceVisibility: 'hidden',
};

// A polygon face drawn as one picture: the ink rim, and the face's colour
// inset within it as a coin's fill is (FACE_INSET). Not a box cut out with clip-path:
// a clip on each face of a tumbling solid is redrawn every frame, and on a
// desktop a throw of four dice dropped two frames in three (22ms a frame,
// 13.7ms drawn this way). Kept per shape and colour, so a die draws each once.
const FACE_PICTURES = new Map();
const FACE_INSET = 9;
function facePicture(corners, tint) {
  const key = `${corners.join(' ')}|${tint}`;
  let picture = FACE_PICTURES.get(key);
  if (!picture) {
    const points = (scale, shift) => corners.map(([x, y]) => `${shift + x * scale},${shift + y * scale}`).join(' ');
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none">'
      + `<polygon points="${points(1, 0)}" fill="${UI_COLORS.dieEdge}"/>`
      + `<polygon points="${points(1 - (2 * FACE_INSET) / 100, FACE_INSET)}" fill="${tint}"/></svg>`;
    picture = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
    FACE_PICTURES.set(key, picture);
  }
  return picture;
}

// A coin's disc of colour within its rim.
const faceFillSx = {
  position: 'absolute',
  inset: `${FACE_INSET}%`,
};
