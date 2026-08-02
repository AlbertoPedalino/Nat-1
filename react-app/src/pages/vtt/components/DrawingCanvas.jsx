import { useLayoutEffect, useRef } from 'react';
import { Box } from '@mui/material';
import { cellSize, worldToScreen } from '../../../shared/vtt/geometry.js';

// Committed strokes plus the one still under the pointer, on the same canvas so
// the live stroke lines up exactly with where it will land.
export default function DrawingCanvas({ drawings, live, lasers, measure, grid, view, onTop = false }) {
  const canvasRef = useRef(null);

  // Layout effect, not effect: the map image moves by CSS transform, which the
  // browser applies in the same paint as this commit. Drawing in a plain effect
  // lands one frame later, so during a drag the fog trailed the map and let the
  // edge of the board show through.
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const host = canvas.parentElement;
    const width = host?.clientWidth || 0;
    const height = host?.clientHeight || 0;
    if (!width || !height) return;

    const ratio = window.devicePixelRatio || 1;
    if (canvas.width !== width * ratio || canvas.height !== height * ratio) {
      canvas.width = width * ratio;
      canvas.height = height * ratio;
    }

    const context = canvas.getContext('2d');
    if (!context) return;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, height);
    context.lineCap = 'round';
    context.lineJoin = 'round';

    const cell = cellSize(grid);
    const toScreen = (point) => worldToScreen(
      { x: point.x * cell + (grid.offsetX || 0), y: point.y * cell + (grid.offsetY || 0) },
      view,
    );

    const strokes = live?.points?.length ? [...(drawings || []), live] : (drawings || []);
    for (const stroke of strokes) {
      const points = stroke?.points || [];
      if (!points.length) continue;

      // A note is anchored by one point and drawn as text, not as a mark.
      if (stroke.text) {
        const at = toScreen(points[0]);
        const fontSize = Math.max(10, ((stroke.width || 3) / 3) * cell * view.zoom * 0.4);
        context.font = `700 ${fontSize}px "EB Garamond", Georgia, serif`;
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        // Outlined rather than boxed: a plate would hide the map under every
        // label, and text over a busy battlemap is unreadable without one.
        context.lineWidth = Math.max(2, fontSize / 6);
        context.strokeStyle = 'rgba(0,0,0,0.85)';
        context.strokeText(stroke.text, at.x, at.y);
        context.fillStyle = stroke.color || '#e8c96a';
        context.fillText(stroke.text, at.x, at.y);
        continue;
      }
      context.strokeStyle = stroke.color || '#e8c96a';
      // Width is in cells so a stroke keeps its thickness relative to the map
      // as you zoom, rather than turning into a hairline.
      context.lineWidth = Math.max(1, ((stroke.width || 3) / 10) * cell * view.zoom);

      const first = toScreen(points[0]);
      if (points.length === 1) {
        // A tap is a dot, and a zero-length path draws nothing at all.
        context.beginPath();
        context.arc(first.x, first.y, context.lineWidth / 2, 0, Math.PI * 2);
        context.fillStyle = stroke.color || '#e8c96a';
        context.fill();
        continue;
      }

      context.beginPath();
      context.moveTo(first.x, first.y);
      for (const point of points.slice(1)) {
        const at = toScreen(point);
        context.lineTo(at.x, at.y);
      }
      context.stroke();
    }

    // The ruler, above the marks and below the laser: a template you are still
    // dragging has to be readable over whatever it covers.
    if (measure?.from && measure?.to) {
      const from = toScreen(measure.from);
      const to = toScreen(measure.to);
      const reach = Math.hypot(to.x - from.x, to.y - from.y);
      context.strokeStyle = '#6fd1e8';
      context.fillStyle = 'rgba(111,209,232,0.18)';
      context.lineWidth = 2;
      context.setLineDash([6, 4]);

      context.beginPath();
      if (measure.shape === 'radius') {
        context.arc(from.x, from.y, reach, 0, Math.PI * 2);
      } else if (measure.shape === 'square') {
        // Centred on the origin, like a 5e cube placed on a square.
        context.rect(from.x - reach, from.y - reach, reach * 2, reach * 2);
      } else if (measure.shape === 'cone') {
        // 5e cones are as wide at the far end as they are long, which is a 53°
        // spread — not the 60° people assume.
        const angle = Math.atan2(to.y - from.y, to.x - from.x);
        const spread = Math.atan(0.5);
        context.moveTo(from.x, from.y);
        context.lineTo(from.x + Math.cos(angle - spread) * reach, from.y + Math.sin(angle - spread) * reach);
        context.lineTo(from.x + Math.cos(angle + spread) * reach, from.y + Math.sin(angle + spread) * reach);
        context.closePath();
      } else {
        context.moveTo(from.x, from.y);
        context.lineTo(to.x, to.y);
      }
      if (measure.shape !== 'line') context.fill();
      context.stroke();
      context.setLineDash([]);

      if (measure.label) {
        context.font = '700 13px "Cinzel", Georgia, serif';
        context.textAlign = 'center';
        context.textBaseline = 'bottom';
        context.lineWidth = 3;
        context.strokeStyle = 'rgba(0,0,0,0.9)';
        context.strokeText(measure.label, to.x, to.y - 8);
        context.fillStyle = '#dff4fb';
        context.fillText(measure.label, to.x, to.y - 8);
      }
    }

    // Laser dots last, on top of everything: they are a finger pointing at the
    // map, and they are never stored — see useSceneLive.
    for (const laser of lasers || []) {
      const at = toScreen(laser);
      const radius = Math.max(4, cell * view.zoom * 0.12);
      const glow = context.createRadialGradient(at.x, at.y, 0, at.x, at.y, radius * 2.2);
      glow.addColorStop(0, 'rgba(255,80,70,0.95)');
      glow.addColorStop(1, 'rgba(255,80,70,0)');
      context.fillStyle = glow;
      context.beginPath();
      context.arc(at.x, at.y, radius * 2.2, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = 'rgba(255,235,230,0.95)';
      context.beginPath();
      context.arc(at.x, at.y, radius * 0.45, 0, Math.PI * 2);
      context.fill();

      // Whose pointer it is. Your own carries no label: you know where your own
      // hand is, and a name stuck to your cursor is just something in the way.
      if (laser.label) {
        context.font = '700 11px "Cinzel", Georgia, serif';
        context.textAlign = 'center';
        context.textBaseline = 'top';
        context.lineWidth = 3;
        context.strokeStyle = 'rgba(0,0,0,0.9)';
        context.strokeText(laser.label, at.x, at.y + radius * 2.4);
        context.fillStyle = '#ffd9d4';
        context.fillText(laser.label, at.x, at.y + radius * 2.4);
      }
    }
  }, [drawings, grid, lasers, live, measure, view]);

  return <Box component="canvas" ref={canvasRef} aria-hidden sx={{ ...canvasSx, ...(onTop ? topSx : null) }} />;
}

// Above the fog and above the pieces. A laser pointing at a creature standing in
// an unexplored room has to be visible on both, or the gesture means nothing.
const topSx = { zIndex: 4 };

const canvasSx = {
  position: 'absolute',
  inset: 0,
  pointerEvents: 'none',
  width: '100%',
  height: '100%',
};
