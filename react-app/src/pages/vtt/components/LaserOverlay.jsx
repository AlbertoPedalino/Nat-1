import { useLayoutEffect, useRef } from 'react';
import { Box } from '@mui/material';
import { VTT_COLORS, vttAlpha } from '../../../shared/vtt/colors.js';
import { cellSize, worldToScreen } from '../../../shared/vtt/geometry.js';

// Remote positions arrive as snapshots, one every LASER_BROADCAST_MS at most.
// Reaching each target in exactly that interval keeps the motion continuous —
// the tween ends as the next position lands — while the dot stays as close as
// the network allows to the finger that is moving it. Going longer smooths
// jitter further but makes the pointer trail the person holding it.
const REMOTE_LASER_TWEEN_MS = 50;

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

  // The point itself is written by the pointer handler without a React state
  // update. Reading it once per paint keeps the local dot at display speed while
  // the network remains free to use its much lower broadcast rate.
  useLayoutEffect(() => {
    let frame = 0;
    const draw = () => {
      placeLaser(dotRef.current, pointRef.current, grid, view);
      frame = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(frame);
  }, [grid, pointRef, view]);

  return <LaserDot dotRef={dotRef} local />;
}

function RemoteLaser({ laser, grid, view }) {
  const dotRef = useRef(null);
  const displayedRef = useRef(null);

  useLayoutEffect(() => {
    const target = { x: Number(laser.x) || 0, y: Number(laser.y) || 0 };
    const start = displayedRef.current;
    if (!start) {
      displayedRef.current = target;
      placeLaser(dotRef.current, target, grid, view);
      return undefined;
    }

    // A camera move changes only the projection, so it should be reflected at
    // once. A new network position is the part that needs interpolation.
    if (start.x === target.x && start.y === target.y) {
      placeLaser(dotRef.current, target, grid, view);
      return undefined;
    }

    let frame = 0;
    // Use the animation clock supplied to the callback. Besides being the
    // browser's authoritative paint clock, this avoids mixing time origins in
    // test environments and embedded webviews.
    let startedAt = null;
    const draw = (now) => {
      if (startedAt === null) startedAt = now;
      const progress = Math.min(1, Math.max(0, (now - startedAt) / REMOTE_LASER_TWEEN_MS));
      const point = {
        x: start.x + (target.x - start.x) * progress,
        y: start.y + (target.y - start.y) * progress,
      };
      displayedRef.current = point;
      placeLaser(dotRef.current, point, grid, view);
      if (progress < 1) frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [grid, laser.x, laser.y, view]);

  return <LaserDot dotRef={dotRef} label={laser.label} />;
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
    node.style.display = 'none';
    return;
  }

  const cell = cellSize(grid);
  const at = worldToScreen({
    x: point.x * cell + (grid.offsetX || 0),
    y: point.y * cell + (grid.offsetY || 0),
  }, view);
  const radius = Math.max(4, cell * view.zoom * 0.12);
  const diameter = radius * 4.4;
  node.style.display = 'block';
  node.style.width = `${diameter}px`;
  node.style.height = `${diameter}px`;
  node.style.setProperty('--laser-core-size', `${radius * 0.9}px`);
  node.style.setProperty('--laser-label-gap', `${radius * 0.2}px`);
  node.style.transform = `translate3d(${at.x - diameter / 2}px, ${at.y - diameter / 2}px, 0)`;
}

const overlaySx = {
  position: 'absolute',
  inset: 0,
  zIndex: 4,
  overflow: 'hidden',
  pointerEvents: 'none',
};

const dotSx = {
  position: 'absolute',
  left: 0,
  top: 0,
  display: 'none',
  borderRadius: '50%',
  background: `radial-gradient(circle, ${vttAlpha(VTT_COLORS.laser, 0.95)} 0%, ${vttAlpha(VTT_COLORS.laser, 0)} 100%)`,
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
  bgcolor: vttAlpha(VTT_COLORS.laserCore, 0.95),
  transform: 'translate(-50%, -50%)',
};

const labelSx = {
  position: 'absolute',
  left: '50%',
  top: 'calc(100% + var(--laser-label-gap))',
  transform: 'translateX(-50%)',
  color: VTT_COLORS.laserText,
  fontFamily: '"Cinzel", Georgia, serif',
  fontSize: 11,
  fontWeight: 700,
  lineHeight: 1,
  whiteSpace: 'nowrap',
  textShadow: `-1px -1px 0 ${VTT_COLORS.black}, 1px -1px 0 ${VTT_COLORS.black}, -1px 1px 0 ${VTT_COLORS.black}, 1px 1px 0 ${VTT_COLORS.black}`,
};
