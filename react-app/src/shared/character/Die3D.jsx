import { Box } from '@mui/material';
import CoinFace from './CoinFace.jsx';
import { faceValues, tumbleTurns } from './dice3d.js';
import { dieGeometry } from './polyhedra.js';

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

  // A hundred-faced die is a hundred clipped planes, each composited on its own.
  // That is worth paying for where the die is the point — rolling across the
  // table — and nowhere else: a roll log holding forty of them brought the whole
  // page down. Anywhere the die is only standing for a number it already knows,
  // a crowded solid is drawn as the single face it landed on, which the geometry
  // has already turned to face the reader.
  const crowded = geometry.faces.length > CROWDED_FACES;
  const flat = crowded && !solid;
  const drawn = flat ? [geometry.faces[landed]] : geometry.faces;
  const spinning = spin && !flat;

  // One size for every number on the die, taken from the longest of them and
  // from the least room any face has. Sizing each number to its own width made
  // a 7 half again as big as a 17 on the same die, which no real die does.
  const room = Math.min(...geometry.faces.map((face) => face.room || 0.15));
  const digits = values.reduce((longest, value) => Math.max(longest, String(value).length), 1);
  const glyph = numberSize(size, room, digits);

  return (
    <Box sx={{ ...sceneSx, width: size, height: size }}>
      <Box
        ref={solidRef}
        sx={{
          ...solidSx,
          width: size,
          height: size,
          ...(spinning ? {
            animationName: 'gbDieTumble',
            animationDuration: `${spinMs}ms`,
            animationDelay: `${tumble.delayMs}ms`,
            '--gb-die-x': `${-tumble.x * turns}deg`,
            '--gb-die-y': `${-tumble.y * turns}deg`,
          } : null),
          opacity: dimmed ? 0.35 : 1,
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
                lineHeight: 1,
                // A face is either a polygon cut out of the box, or — on a coin —
                // a disc the browser rounds off for us.
                clipPath: face.clipPath,
                borderRadius: face.borderRadius,
                transform: face.transform,
                // Only the face that landed carries the result's colour — red
                // for a 1, gold for the top of the die — and the rest are
                // scenery that must not shout "natural 20" at you.
                color: index === landed ? color : 'text.secondary',
              }}
            >
              <Box sx={{
                ...faceFillSx,
                clipPath: face.clipPath,
                borderRadius: face.borderRadius,
                bgcolor: faceTint(face, dimmed),
              }} />
              {/* A coin is struck, not numbered: the two sides carry a head and
                  a cross, and the 1 and 2 behind them are only what the total is
                  made of. */}
              {geometry.shape === 2 ? (
                <CoinFace kind={values[index] === 2 ? 'tails' : 'heads'} size={size * 0.56} />
              ) : null}
              {geometry.shape !== 2 ? (
                <Box component="span" sx={{ position: 'relative' }}>{values[index]}</Box>
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

// A number as large as its face can hold. The face's own incircle is the
// limit — a triangle holds much less than a square — and a second digit needs
// room sideways that one does not, which is exactly how "20" ended up with its
// corners clipped off.
function numberSize(size, room, characters) {
  const across = size * (room || 0.15) * 2;
  const fit = characters === 1 ? 1.15 : 1 / (0.62 * characters + 0.2);
  // The floor follows the face rather than being a flat legibility minimum: on
  // a hundred-sided die a 7px numeral is wider than the triangle holding it, so
  // it came out clipped in half. A blur of tiny numerals is what a d100 looks
  // like anyway, and it beats a die with blank faces.
  const floor = Math.min(7, Math.max(3, Math.round(across * 0.8)));

  // Capped so a d6, whose faces are nearly all room, does not end up with a
  // number bigger than the die reads as.
  return Math.max(floor, Math.round(Math.min(size * 0.44, across * fit)));
}

// Past this many faces a die is too busy to draw in full anywhere it is not the
// thing being watched, and its numbers are smaller than a legible glyph.
const CROWDED_FACES = 24;

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
// is what stops an icosahedron from reading as a gold blob when it turns.
//
// A die the mode threw away keeps its shape but loses its colour: it is still
// shown, because seeing what advantage saved you from is half of why advantage
// is fun.
function faceTint(face, dimmed) {
  const lit = Math.max(0, face.towardsViewer);
  if (dimmed) return `rgb(${Math.round(44 + 16 * lit)},${Math.round(40 + 14 * lit)},${Math.round(33 + 11 * lit)})`;
  return `rgb(${Math.round(56 + 38 * lit)},${Math.round(48 + 30 * lit)},${Math.round(33 + 18 * lit)})`;
}

const faceSx = {
  position: 'absolute',
  left: 0,
  top: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  // The rim: gold showing around a darker face, so every edge on the solid is
  // drawn without a border the clip would have eaten. Opaque, or the board
  // shows through the die and it reads as glass rather than as a solid thing.
  bgcolor: 'rgb(196,160,78)',
  fontFamily: '"Cinzel", Georgia, serif',
  fontWeight: 700,
  backfaceVisibility: 'hidden',
};

// A panel of the band round a coin's edge. It carries no number and cannot be
// a result, so it needs no clip and no fill of its own — it is the side of the
// thing, and it is sized rather than cut out.
const rimSx = {
  position: 'absolute',
  left: '50%',
  top: '50%',
  bgcolor: 'rgb(150,120,58)',
  backfaceVisibility: 'hidden',
};

const faceFillSx = {
  position: 'absolute',
  inset: '7%',
};
