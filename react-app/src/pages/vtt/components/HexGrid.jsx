import { memo, useMemo } from 'react';
import { Box } from '@mui/material';
import {
  hexHeight, hexRowStep, hexWidth, hexKey,
} from '../../../shared/vtt/hexGeometry.js';
import { screenToWorld } from '../../../shared/vtt/geometry.js';

// The hex overlay. An SVG rather than the CSS gradient the square grid uses:
// hexes interlock, so there is no repeating tile that draws them.
//
// Only the hexes the viewport covers are built, and only while they are big
// enough to see — a wilderness map zoomed out to the whole continent would
// otherwise ask for tens of thousands of paths nobody can make out.
//
// The geometry is built in one pass of plain arithmetic and cached until the
// view actually moves. It used to be six trig calls, a dozen allocations and a
// regex per hex per frame, and a map with a few hundred hexes on screen spent
// long enough on that to be felt in every pan.
const MIN_VISIBLE_WIDTH = 8;
const MAX_HEXES = 4000;
const DEFAULT_FILL_OPACITY = 0.42;

// The six corners of a pointy-top hex on the unit circle, clockwise from the
// top. Constant: only the radius and the centre change per hex.
const UNIT_CORNERS = Array.from({ length: 6 }, (_, index) => {
  const angle = (Math.PI / 180) * (60 * index - 90);
  return { cos: Math.cos(angle), sin: Math.sin(angle) };
});

// Half a pixel is finer than any of this can be seen at, and short numbers keep
// the path string — which is one attribute the browser re-parses on every pan —
// a fraction of the size.
const snap = (value) => Math.round(value * 2) / 2;

function hexPath(cx, cy, radius) {
  let d = '';
  for (let index = 0; index < 6; index += 1) {
    const corner = UNIT_CORNERS[index];
    d += `${index === 0 ? 'M' : 'L'}${snap(cx + radius * corner.cos)},${snap(cy + radius * corner.sin)}`;
  }
  return `${d}Z`;
}

function buildGeometry({ grid, view, width, height, cells, selected }) {
  const zoom = Number(view?.zoom) || 1;
  const worldWidth = hexWidth(grid);
  if (!width || !height || worldWidth * zoom < MIN_VISIBLE_WIDTH) return null;

  const topLeft = screenToWorld({ x: 0, y: 0 }, view);
  const bottomRight = screenToWorld({ x: width, y: height }, view);
  const offsetX = Number(grid?.offsetX) || 0;
  const offsetY = Number(grid?.offsetY) || 0;
  const rowStep = hexRowStep(grid);
  const radius = (hexHeight(grid) / 2) * zoom;
  const viewX = Number(view?.x) || 0;
  const viewY = Number(view?.y) || 0;

  const left = topLeft.x - offsetX;
  const top = topLeft.y - offsetY;
  const right = bottomRight.x - offsetX;
  const bottom = bottomRight.y - offsetY;

  const firstRow = Math.floor(top / rowStep) - 1;
  const lastRow = Math.ceil(bottom / rowStep) + 1;
  const rows = lastRow - firstRow + 1;
  const columns = Math.ceil(right / worldWidth) - Math.floor(left / worldWidth) + 3;
  if (rows * columns > MAX_HEXES) return null;

  let outlines = '';
  // One path per colour rather than one polygon per hex: a travelled country is
  // hundreds of hexes in the same green, and that is hundreds of elements the
  // browser would lay out on every frame.
  const fills = new Map();
  const selectedKey = selected ? hexKey(selected) : null;
  let selectedPath = null;

  for (let r = firstRow; r <= lastRow; r += 1) {
    const shift = r / 2;
    const firstCol = Math.floor(left / worldWidth - shift) - 1;
    const lastCol = Math.ceil(right / worldWidth - shift) + 1;
    const cy = (rowStep * r + offsetY) * zoom + viewY;
    // Rows scrolled past the top or bottom edge contribute nothing but string.
    if (cy < -radius || cy > height + radius) continue;

    for (let q = firstCol; q <= lastCol; q += 1) {
      const cx = (worldWidth * (q + shift) + offsetX) * zoom + viewX;
      if (cx < -radius || cx > width + radius) continue;

      const path = hexPath(cx, cy, radius);
      outlines += path;

      const key = `${q}:${r}`;
      const painted = cells?.get?.(key);
      if (painted?.color) {
        const opacity = painted.opacity ?? DEFAULT_FILL_OPACITY;
        const fillKey = `${painted.color}|${opacity}`;
        const group = fills.get(fillKey);
        if (group) group.d += path;
        else fills.set(fillKey, { color: painted.color, opacity, d: path });
      }
      if (selectedKey && key === selectedKey) selectedPath = path;
    }
  }

  return { outlines, fills: [...fills.entries()], selectedPath };
}

function HexGrid({
  grid, view, viewportSize, cells = null, selected = null, opacity = 1,
  lineColor = 'rgba(232,201,106,0.28)', lineWidth = 1,
}) {
  const width = Math.max(0, Number(viewportSize?.width) || 0);
  const height = Math.max(0, Number(viewportSize?.height) || 0);
  const geometry = useMemo(
    () => buildGeometry({ grid, view, width, height, cells, selected }),
    [cells, grid, height, selected, view, width],
  );

  if (!geometry) return null;

  return (
    <Box
      component="svg"
      aria-hidden
      width={width}
      height={height}
      sx={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        opacity,
      }}
    >
      {/* Painted hexes go under the outlines, so the border of a coloured hex is
          still the same line as its neighbour's. */}
      {geometry.fills.map(([key, fill]) => (
        <path key={key} d={fill.d} fill={fill.color} fillOpacity={fill.opacity} />
      ))}

      <path d={geometry.outlines} fill="none" stroke={lineColor} strokeWidth={lineWidth} />

      {geometry.selectedPath ? (
        <path
          d={geometry.selectedPath}
          fill="none"
          stroke="rgba(232,201,106,0.95)"
          strokeWidth={2.5}
        />
      ) : null}
    </Box>
  );
}

// The viewport re-renders for everything that moves on it — dice, bubbles, a
// laser dot, a token being dragged — and none of that changes the grid.
export default memo(HexGrid);
