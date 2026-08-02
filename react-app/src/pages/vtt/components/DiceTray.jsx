import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Box } from '@mui/material';
import Die3D from '../../../shared/character/Die3D.jsx';
import { faceNumbering } from '../../../shared/character/dice3d.js';
import { dieGeometry } from '../../../shared/character/polyhedra.js';
import {
  MAX_THROWN_DICE,
  TRAY,
  orientationMatrix,
  simulateThrow,
} from '../../../shared/vtt/dicePhysics.js';

const DIE_SIZE = 76;
// How far a die is lifted and enlarged per pixel of height over the table. Only
// enough to read as "off the board" — the view is from above, so a die that
// climbed the screen as it rose would look like it was flying away.
const LIFT = 0.16;
const GROWTH = 0.0018;

// The map as a table: dice come down onto the board, bounce, skid into each
// other and settle showing what was rolled.
//
// Screen space, not world space — a die is an object on the table, not a thing
// painted on the map, so it keeps its size when the board is zoomed and does not
// slide when the board is panned. It never takes a pointer event: the map
// underneath stays usable while dice are still rolling.
export default function DiceTray({ throws }) {
  const hostRef = useRef(null);
  const [table, setTable] = useState(null);
  // When each throw was first seen here, on this machine's clock.
  //
  // A throw plays from that moment, not from when its component mounted:
  // re-renders, a remount, or React running effects twice in development would
  // otherwise restart it from the air every time, which is what left dice
  // hanging there. It also means somebody who opens the map mid-throw sees the
  // dice where they actually are, and the roller's clock never has to agree
  // with anybody else's.
  const startedAt = useRef(new Map());

  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;
    const measure = () => setTable({ width: host.clientWidth, height: host.clientHeight });
    measure();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  const live = throws || [];
  const now = Date.now();
  for (const entry of live) {
    if (!startedAt.current.has(entry.roll.id)) startedAt.current.set(entry.roll.id, now);
  }
  // Rolls expire; their start times must not outlive them.
  for (const id of startedAt.current.keys()) {
    if (!live.some((entry) => entry.roll.id === id)) startedAt.current.delete(id);
  }

  return (
    <Box ref={hostRef} sx={rootSx}>
      {table?.width ? live.map((entry) => (
        <DiceThrow
          key={entry.roll.id}
          roll={entry.roll}
          at={{ x: entry.x, y: entry.y }}
          table={table}
          startedAt={startedAt.current.get(entry.roll.id)}
        />
      )) : null}
    </Box>
  );
}

function DiceThrow({ roll, at, table, startedAt }) {
  const bodyRefs = useRef([]);
  const solidRefs = useRef([]);
  const shadowRefs = useRef([]);

  // Everything about a throw comes from the roll's id, and a roll never changes
  // once it exists. Depending on anything else — the dice array's identity, the
  // size of the window — would restart the throw from the air every time the
  // scene around it re-rendered.
  const thrown = useMemo(() => {
    const dice = (roll.rolls || []).slice(0, MAX_THROWN_DICE);
    const { frames, frameMs, results } = simulateThrow(dice, roll.id, { size: DIE_SIZE });
    return {
      frames,
      frameMs,
      dice: dice.map((die, index) => {
        const geometry = dieGeometry(die.faces);
        const numbering = faceNumbering(geometry.faces.length, die.faces, `${roll.id}:${index}`);
        const landed = results[index] ?? geometry.landing;
        // The throw decided this number, but the roll that was published is
        // what the table has already been told. Painting it onto the face that
        // landed means the dice can never contradict the log, even if a future
        // change lets one screen's throw drift from another's.
        numbering[landed] = die.v;
        return { ...die, numbering, landed };
      }),
    };
  }, [roll]);

  // The tray is a fixed size, so keep it on screen whatever the anchor is: a
  // piece can be panned half out of view, and dice that land where nobody can
  // see them are dice that were never thrown.
  const x = clamp(at.x, TRAY.width / 2, Math.max(TRAY.width / 2, table.width - TRAY.width / 2));
  const y = clamp(at.y, TRAY.height / 2, Math.max(TRAY.height / 2, table.height - TRAY.height / 2));

  const paint = (frame) => {
    frame.forEach((die, index) => {
      const body = bodyRefs.current[index];
      const solid = solidRefs.current[index];
      const shadow = shadowRefs.current[index];
      if (body) {
        body.style.transform = `translate3d(${die.x}px, ${die.y - die.z * LIFT}px, 0)`
          + ` scale(${(1 + die.z * GROWTH).toFixed(3)})`;
      }
      if (solid) {
        solid.style.transform = `matrix3d(${orientationMatrix(die.q).join(',')})`;
      }
      if (shadow) {
        // The shadow stays on the table while the die is above it: smaller and
        // fainter the higher the die, which is what says "this is falling".
        const height = Math.min(1, die.z / 260);
        shadow.style.opacity = `${(0.62 - 0.5 * height).toFixed(2)}`;
        shadow.style.transform = `translate(${die.z * LIFT}px, 0) scale(${(1 - 0.45 * height).toFixed(3)})`;
      }
    });
  };

  // How far into the throw we are. Clamped at zero on purpose: the frame index
  // used to be worked out from the timestamp the browser hands to
  // requestAnimationFrame, which is when that frame began and can predate the
  // moment the throw was scheduled. A negative index reads past the start of
  // the frame list, and painting `undefined` threw out of the animation loop —
  // leaving the dice hanging wherever they were, which happened more often the
  // more dice there were to draw.
  const frameAt = (now) => Math.max(0, Math.floor((now - (startedAt ?? now)) / thrown.frameMs));

  // Written straight to the elements rather than through state: a throw is sixty
  // frames a second of pure movement, and re-rendering the tree for each would
  // be a lot of React for something the compositor can do alone.
  //
  // Before the first paint, or the dice show for one frame stacked at the anchor
  // before the throw starts. Wherever the throw is up to, not necessarily its
  // beginning.
  useLayoutEffect(() => {
    const { frames } = thrown;
    if (frames.length) paint(frames[Math.min(frameAt(Date.now()), frames.length - 1)]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thrown, startedAt]);

  useEffect(() => {
    const { frames, frameMs } = thrown;
    if (!frames.length || frameAt(Date.now()) >= frames.length - 1) return undefined;

    const reduced = typeof window !== 'undefined'
      && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      paint(frames[frames.length - 1]);
      return undefined;
    }

    let raf = 0;
    const tick = () => {
      const index = frameAt(Date.now());
      paint(frames[Math.min(index, frames.length - 1)]);
      // A slow frame skips ahead rather than stretching the throw, and the loop
      // only ends once the dice are down.
      if (index < frames.length - 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thrown, startedAt]);

  return (
    <Box sx={{ ...anchorSx, left: x, top: y }}>
      {thrown.dice.map((die, index) => (
        <Box
          key={index}
          ref={(element) => { bodyRefs.current[index] = element; }}
          sx={bodySx}
        >
          <Box ref={(element) => { shadowRefs.current[index] = element; }} sx={shadowSx} />
          <Die3D
            value={die.v}
            faces={die.faces}
            color="#edd48a"
            size={DIE_SIZE}
            seed={`${roll.id}:${index}`}
            numbering={die.numbering}
            landing={die.landed}
            // The full polyhedron, however many faces it has — this is where a
            // die is worth drawing properly. A handful at a time: a fistful of
            // hundred-sided dice is a few thousand composited planes at once.
            solid={thrown.dice.length <= 3}
            spin={false}
            solidRef={(element) => { solidRefs.current[index] = element; }}
          />
        </Box>
      ))}
    </Box>
  );
}

function clamp(value, lower, upper) {
  return Math.max(lower, Math.min(upper, value));
}

const rootSx = {
  position: 'absolute',
  inset: 0,
  zIndex: 8,
  pointerEvents: 'none',
  overflow: 'hidden',
};

const anchorSx = {
  position: 'absolute',
  width: 0,
  height: 0,
};

const bodySx = {
  position: 'absolute',
  // The simulation's coordinates are where the die is, not where its corner is.
  marginLeft: `${-DIE_SIZE / 2}px`,
  marginTop: `${-DIE_SIZE / 2}px`,
  willChange: 'transform',
};

// What puts a die on the table rather than in front of it.
const shadowSx = {
  position: 'absolute',
  left: '10%',
  right: '10%',
  bottom: -4,
  height: 8,
  borderRadius: '50%',
  bgcolor: 'rgba(0,0,0,0.55)',
  filter: 'blur(3px)',
  opacity: 0,
};
