import { useLayoutEffect, useRef } from 'react';
import { Box } from '@mui/material';
import { useResizeTick } from './useResizeTick.js';
import { VTT_COLORS, vttAlpha } from '../../../shared/vtt/colors.js';
import { cellSize, worldToScreen } from '../../../shared/vtt/map/geometry.js';
import { CONE_SPREAD, areaGeometry, areaLabelAnchor, squareTurn } from '../../../shared/vtt/map/areas.js';
import { isNote, strokeLabelAnchor } from '../../../shared/vtt/map/drawing.js';

// Committed strokes plus the one still under the pointer, on the same canvas so
// the live stroke lines up exactly with where it will land.
export default function DrawingCanvas({ drawings, selectedId, live, measure, grid, view, onTop = false }) {
  const canvasRef = useRef(null);
  // Redraw when the box changes: the canvas is measured in its own pixels.
  const resizeTick = useResizeTick(canvasRef);

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

      // The one in hand, marked out by a halo under it rather than by an
      // outline around it: a stroke has no outline to draw, and text would lose
      // the dark edge that makes it readable over a busy map.
      if (selectedId && stroke.id === selectedId) {
        context.save();
        context.shadowColor = vttAlpha(VTT_COLORS.drawingGuide, 0.95);
        context.shadowBlur = Math.max(6, cell * view.zoom * 0.25);
        drawStroke(context, stroke, points, toScreen, cell, view);
        context.restore();
      }

      // Hidden from the players: still the GM's to see, but plainly not
      // on the table.
      context.globalAlpha = stroke.hiddenFromPlayers ? 0.45 : 1;
      drawStroke(context, stroke, points, toScreen, cell, view);
      context.globalAlpha = 1;
    }

    // The ruler above the marks: a template you are still dragging has to be
    // readable over whatever it covers. The laser has its own animated overlay.
    if (measure?.from && measure?.to) {
      const from = toScreen(measure.from);
      const to = toScreen(measure.to);
      const reach = Math.hypot(to.x - from.x, to.y - from.y);
      context.strokeStyle = VTT_COLORS.drawingGuide;
      context.fillStyle = vttAlpha(VTT_COLORS.drawingGuide, 0.18);
      context.lineWidth = 2;
      context.setLineDash([6, 4]);

      context.beginPath();
      if (measure.shape === 'radius') {
        context.arc(from.x, from.y, reach, 0, Math.PI * 2);
      } else if (measure.shape === 'square') {
        // Centred on the origin, like a 5e cube placed on a square, with the
        // pointer on the middle of a side: it turns as the pointer goes round.
        context.save();
        context.translate(from.x, from.y);
        context.rotate(squareTurn(to.x - from.x, to.y - from.y));
        context.rect(-reach, -reach, reach * 2, reach * 2);
        context.restore();
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
        context.strokeStyle = vttAlpha(VTT_COLORS.black, 0.9);
        context.strokeText(measure.label, to.x, to.y - 8);
        context.fillStyle = VTT_COLORS.drawingText;
        context.fillText(measure.label, to.x, to.y - 8);
      }
    }

  }, [drawings, grid, live, measure, selectedId, view, resizeTick]);

  return <Box component="canvas" ref={canvasRef} aria-hidden sx={{ ...canvasSx, ...(onTop ? topSx : null) }} />;
}

// Above the fog and above the pieces. A laser pointing at a creature standing in
// an unexplored room has to be visible on both, or the gesture means nothing.
const topSx = { zIndex: 4 };

// One mark, whether it is a line, a dot, a word or an area.
function drawStroke(context, stroke, points, toScreen, cell, view) {
  if (stroke.area) {
    drawArea(context, stroke, toScreen, cell, view);
    return;
  }

  // A note is anchored by one point and drawn as text, not as a mark.
  if (isNote(stroke)) {
    const at = toScreen(points[0]);
    const fontSize = Math.max(10, ((stroke.width || 3) / 3) * cell * view.zoom * 0.4);
    context.font = `700 ${fontSize}px "EB Garamond", Georgia, serif`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    // Outlined rather than boxed: a plate would hide the map under every label,
    // and text over a busy battlemap is unreadable without one.
    context.lineWidth = Math.max(2, fontSize / 6);
    context.strokeStyle = vttAlpha(VTT_COLORS.black, 0.85);
    context.strokeText(stroke.text, at.x, at.y);
    context.fillStyle = stroke.color || VTT_COLORS.gold;
    context.fillText(stroke.text, at.x, at.y);
    return;
  }

  context.strokeStyle = stroke.color || VTT_COLORS.gold;
  // Width is in cells so a stroke keeps its thickness relative to the map as you
  // zoom, rather than turning into a hairline.
  context.lineWidth = Math.max(1, ((stroke.width || 3) / 10) * cell * view.zoom);

  const first = toScreen(points[0]);
  if (points.length === 1) {
    // A tap is a dot, and a zero-length path draws nothing at all.
    context.beginPath();
    context.arc(first.x, first.y, context.lineWidth / 2, 0, Math.PI * 2);
    context.fillStyle = stroke.color || VTT_COLORS.gold;
    context.fill();
    return;
  }

  context.beginPath();
  context.moveTo(first.x, first.y);
  for (const point of points.slice(1)) {
    const at = toScreen(point);
    context.lineTo(at.x, at.y);
  }
  context.stroke();

  const anchor = stroke.text ? strokeLabelAnchor(points) : null;
  if (anchor) {
    const at = toScreen(anchor.point);
    // Clear of the line's own thickness when it sits above it.
    const lift = anchor.above ? context.lineWidth / 2 + 3 : 0;
    drawMapLabel(context, stroke.text, { x: at.x, y: at.y - lift }, cell * view.zoom, anchor.above ? 'bottom' : 'middle');
  }
}

// An area of effect: its outline, a solid fill in the outline's colour when it
// is filled and has no effect (an effect paints its own, see-through inside,
// on the canvas underneath), and its label in the middle.
function drawArea(context, stroke, toScreen, cell, view) {
  const geometry = areaGeometry(stroke);
  if (!geometry) return;
  const scale = cell * view.zoom;
  const at = toScreen(geometry.origin);
  const reach = geometry.reach * scale;
  const color = stroke.color || VTT_COLORS.gold;
  const { shape, filled, effect } = stroke.area;

  context.beginPath();
  if (shape === 'circle') {
    context.arc(at.x, at.y, reach, 0, Math.PI * 2);
  } else if (shape === 'square') {
    context.save();
    context.translate(at.x, at.y);
    context.rotate(geometry.angle);
    context.rect(-reach, -reach, reach * 2, reach * 2);
    context.restore();
  } else {
    const half = shape === 'cone' ? null : (geometry.breadth * scale) / 2;
    context.save();
    context.translate(at.x, at.y);
    context.rotate(geometry.angle);
    if (shape === 'cone') {
      context.moveTo(0, 0);
      context.lineTo(reach, -reach * CONE_SPREAD);
      context.lineTo(reach, reach * CONE_SPREAD);
      context.closePath();
    } else {
      context.rect(0, -half, reach, half * 2);
    }
    context.restore();
  }

  if (filled && !effect) {
    context.fillStyle = color;
    context.fill();
  }
  // Thinner than ink of the same size: an outline frames, it is not the mark.
  context.strokeStyle = color;
  context.lineWidth = Math.max(1.5, ((stroke.width || 3) / 30) * scale);
  context.stroke();

  const anchor = stroke.text ? areaLabelAnchor(stroke) : null;
  if (anchor) drawMapLabel(context, stroke.text, toScreen(anchor), scale, 'middle');

  // While it is being dragged out: how big it is, by the pointer, in the
  // ruler's colours.
  if (stroke.hint && stroke.points?.[1]) {
    const tip = toScreen(stroke.points[1]);
    context.font = '700 13px "Cinzel", Georgia, serif';
    context.textAlign = 'center';
    context.textBaseline = 'bottom';
    context.lineWidth = 3;
    context.strokeStyle = vttAlpha(VTT_COLORS.black, 0.9);
    context.strokeText(stroke.hint, tip.x, tip.y - 10);
    context.fillStyle = VTT_COLORS.drawingText;
    context.fillText(stroke.hint, tip.x, tip.y - 10);
  }
}

// The label on a stroke or an area: parchment with a dark edge, sized to the
// squares so it reads at any zoom without swamping a small mark.
function drawMapLabel(context, text, at, cellPixels, baseline) {
  const fontSize = Math.max(11, Math.min(26, cellPixels * 0.32));
  context.font = `700 ${fontSize}px "EB Garamond", Georgia, serif`;
  context.textAlign = 'center';
  context.textBaseline = baseline;
  context.lineWidth = Math.max(2, fontSize / 5);
  context.strokeStyle = vttAlpha(VTT_COLORS.black, 0.9);
  context.strokeText(text, at.x, at.y);
  context.fillStyle = VTT_COLORS.parchment;
  context.fillText(text, at.x, at.y);
}

const canvasSx = {
  position: 'absolute',
  inset: 0,
  pointerEvents: 'none',
  width: '100%',
  height: '100%',
};
