import { useLayoutEffect, useRef } from 'react';
import { Box } from '@mui/material';
import { VTT_COLORS, vttAlpha } from '../../../shared/vtt/colors.js';
import { cellSize, worldToScreen } from '../../../shared/vtt/map/geometry.js';
import { FONT_SIZES, LINE_HEIGHTS } from '../../../shared/ui/fonts.js';
import { clamp } from '../../../shared/numbers.js';
import { TEXT_STYLES } from '../../../shared/ui/textStyles.js';
import { OPACITY } from '../../../shared/ui/colors.js';
import { writeLiveStyle } from '../../../shared/ui/liveStyle.js';
import { clippedMapLayerSx, mapLayerSx } from './sceneViewportStyles.js';

// Remote positions arrive as snapshots, one every LASER_BROADCAST_MS at most.
// Reaching each target in exactly that interval keeps the motion continuous —
// the tween ends as the next position lands — while the dot stays as close as
// the network allows to the finger that is moving it. Going longer smooths
// jitter further but makes the pointer trail the person holding it.
const REMOTE_LASER_TWEEN_MS = 50;
const TRAIL_MS = 240;
const TRAIL_SEGMENTS = 32;

export default function LaserOverlay({ lasers, localPointRef, localActive, grid, view }) {
  return (
    <Box aria-hidden sx={overlaySx}>
      {localActive ? <LocalLaser pointRef={localPointRef} grid={grid} view={view} /> : null}
      {(lasers || []).filter((laser) => !laser.local).map((laser) => (
        <RemoteLaser key={laser.id} laser={laser} grid={grid} view={view} />
      ))}
    </Box>
  );
}

function LocalLaser({ pointRef, grid, view }) {
  const dotRef = useRef(null);
  const trailRef = useRef(null);
  const historyRef = useRef([]);

  // The point itself is written by the pointer handler without a React state
  // update. Reading it once per paint keeps the local dot at display speed while
  // the network remains free to use its much lower broadcast rate.
  useLayoutEffect(() => {
    let frame = 0;
    const draw = (now) => {
      placeLaser(dotRef.current, pointRef.current, grid, view);
      paintTrail(trailRef.current, historyRef, pointRef.current, now, grid, view);
      frame = requestAnimationFrame(draw);
    };
    placeLaser(dotRef.current, pointRef.current, grid, view);
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [grid, pointRef, view]);

  return <><LaserTrail trailRef={trailRef} local /><LaserDot dotRef={dotRef} local /></>;
}

function RemoteLaser({ laser, grid, view }) {
  const dotRef = useRef(null);
  const displayedRef = useRef(null);
  const trailRef = useRef(null);
  const historyRef = useRef([]);

  useLayoutEffect(() => {
    const target = { x: Number(laser.x) || 0, y: Number(laser.y) || 0 };
    const start = displayedRef.current || target;
    const moving = start.x !== target.x || start.y !== target.y;
    displayedRef.current = start;
    // Camera changes reproject the dot immediately; trail samples stay in map
    // coordinates so panning cannot manufacture a streak across the screen.
    placeLaser(dotRef.current, start, grid, view);

    let frame = 0;
    // Use the animation clock supplied to the callback. Besides being the
    // browser's authoritative paint clock, this avoids mixing time origins in
    // test environments and embedded webviews.
    let startedAt = null;
    const draw = (now) => {
      if (startedAt === null) startedAt = now;
      const progress = moving ? clamp((now - startedAt) / REMOTE_LASER_TWEEN_MS, 0, 1) : 1;
      const point = {
        x: start.x + (target.x - start.x) * progress,
        y: start.y + (target.y - start.y) * progress,
      };
      displayedRef.current = point;
      placeLaser(dotRef.current, point, grid, view);
      const fading = paintTrail(trailRef.current, historyRef, point, now, grid, view);
      if (progress < 1 || fading) frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [grid, laser.x, laser.y, view]);

  return <><LaserTrail trailRef={trailRef} /><LaserDot dotRef={dotRef} label={laser.label} /></>;
}

function LaserTrail({ trailRef, local = false }) {
  return (
    <Box
      component="svg"
      ref={trailRef}
      data-laser-trail={local ? 'local' : 'remote'}
      sx={trailSx}
      fill="none"
      stroke={VTT_COLORS.laser}
      strokeLinecap="round"
    >
      {Array.from({ length: TRAIL_SEGMENTS }, (_, index) => <line key={index} opacity="0" />)}
    </Box>
  );
}

function projectLaser(point, grid, view) {
  const cell = cellSize(grid);
  return worldToScreen({
    x: point.x * cell + (grid.offsetX || 0),
    y: point.y * cell + (grid.offsetY || 0),
  }, view);
}

function paintTrail(node, historyRef, point, now, grid, view) {
  if (!node) return false;
  const history = point ? historyRef.current.filter((sample) => now - sample.at < TRAIL_MS) : [];
  const last = history.at(-1);
  if (point && (!last || last.x !== point.x || last.y !== point.y)) {
    history.push({ x: point.x, y: point.y, at: now });
  }
  historyRef.current = history.slice(-(TRAIL_SEGMENTS + 1));
  const samples = historyRef.current;
  const width = Math.max(2, cellSize(grid) * view.zoom * 0.07);
  // Reuse a bounded set of SVG segments at paint speed, without React renders
  // or network writes. Still pointers stop adding samples and fade away.
  for (let index = 0; index < TRAIL_SEGMENTS; index += 1) {
    const line = node.children[index];
    if (index + 1 >= samples.length) {
      line.setAttribute('opacity', '0');
      continue;
    }
    const from = projectLaser(samples[index], grid, view);
    const to = projectLaser(samples[index + 1], grid, view);
    const life = Math.max(0, 1 - (now - samples[index].at) / TRAIL_MS);
    line.setAttribute('x1', from.x);
    line.setAttribute('y1', from.y);
    line.setAttribute('x2', to.x);
    line.setAttribute('y2', to.y);
    line.setAttribute('stroke-width', width * (0.25 + life * 0.75));
    line.setAttribute('opacity', life * life * 0.7);
  }
  return samples.length > 1;
}

function LaserDot({ dotRef, label = null, local = false }) {
  return (
    <Box
      ref={dotRef}
      data-local-laser={local ? 'true' : undefined}
      data-remote-laser={!local ? 'true' : undefined}
      sx={dotSx}
    >
      <Box sx={coreSx} />
      {label ? <Box sx={labelSx}>{label}</Box> : null}
    </Box>
  );
}

function placeLaser(node, point, grid, view) {
  if (!node) return;
  if (!point) {
    writeLiveStyle(node, { display: 'none' });
    return;
  }

  const cell = cellSize(grid);
  const at = projectLaser(point, grid, view);
  const radius = Math.max(4, cell * view.zoom * 0.12);
  const diameter = radius * 4.4;
  writeLiveStyle(node, {
    display: 'block',
    width: diameter,
    height: diameter,
    '--laser-core-size': radius * 0.9,
    '--laser-label-gap': radius * 0.2,
    transform: `translate3d(${at.x - diameter / 2}px, ${at.y - diameter / 2}px, 0)`,
  });
}

const overlaySx = { ...clippedMapLayerSx, zIndex: 4 };

const trailSx = {
  ...mapLayerSx,
  filter: `drop-shadow(0 0 3px ${vttAlpha(VTT_COLORS.laser, OPACITY.strong)})`,
};

const dotSx = {
  position: 'absolute',
  left: 0,
  top: 0,
  display: 'none',
  borderRadius: '50%',
  background: `radial-gradient(circle, ${vttAlpha(VTT_COLORS.laser, OPACITY.solid)} 0%, ${vttAlpha(VTT_COLORS.laser, 0)} 100%)`,
  pointerEvents: 'none',
  willChange: 'transform',
};

const coreSx = {
  position: 'absolute',
  left: '50%',
  top: '50%',
  width: 'var(--laser-core-size)',
  height: 'var(--laser-core-size)',
  borderRadius: '50%',
  bgcolor: vttAlpha(VTT_COLORS.laserCore, OPACITY.solid),
  transform: 'translate(-50%, -50%)',
};

const labelSx = {
  position: 'absolute',
  left: '50%',
  top: 'calc(100% + var(--laser-label-gap))',
  transform: 'translateX(-50%)',
  color: VTT_COLORS.laserText,
  ...TEXT_STYLES.figure,
  fontSize: FONT_SIZES.sm,
  lineHeight: LINE_HEIGHTS.none,
  whiteSpace: 'nowrap',
};
