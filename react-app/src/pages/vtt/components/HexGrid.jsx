import { memo, useMemo } from 'react';
import { Box } from '@mui/material';
import { hexHeight, hexRowStep, hexWidth } from '../../../shared/vtt/hexGeometry.js';
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
// A hex narrower than this is thinner than the line drawing it, and the mesh
// turns into a smear. Between here and READABLE_WIDTH it is faded out instead of
// being switched off, so zooming out to the whole continent dims the grid rather
// than dropping it in one frame.
const MIN_VISIBLE_WIDTH = 6;
const READABLE_WIDTH = 16;
// What one frame can afford to build. Half-edges brought the cost of a hex down
// far enough to roughly double this: ~4 ms at the ceiling, and the result is
// cached until the view moves again.
const MAX_HEXES = 9000;
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

// Only the right-hand half of the hex: top, upper right, lower right, bottom.
// Every edge of the lattice is the right-hand edge of exactly one hex, so the
// mesh still comes out whole while the path string is little over half as long
// — which is what decides how far out the grid can be drawn before it costs
// more than it says.
function hexHalfPath(cx, cy, radius) {
  let d = '';
  for (let index = 0; index < 4; index += 1) {
    const corner = UNIT_CORNERS[index];
    d += `${index === 0 ? 'M' : 'L'}${snap(cx + radius * corner.cos)},${snap(cy + radius * corner.sin)}`;
  }
  return d;
}

function buildGeometry({ grid, view, width, height, cells, selected, outlined }) {
  const zoom = Number(view?.zoom) || 1;
  const worldWidth = hexWidth(grid);
  if (!width || !height) return null;

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
  // Zoomed far enough out, the mesh is more hexes than the browser can draw in a
  // frame and finer than an eye can separate. It stops being drawn — but only
  // it: the country the party has walked and the hex under the cursor are the
  // map's content, and they are painted at any zoom. Losing those on the way out
  // to "the whole continent" is losing the point of the view.
  const screenWidth = worldWidth * zoom;
  const meshWorthDrawing = Boolean(outlined)
    && screenWidth >= MIN_VISIBLE_WIDTH
    && rows * columns <= MAX_HEXES;

  // Painted hexes are looked up from what the campaign has recorded rather than
  // by walking the viewport: there are hundreds of those at most, against tens
  // of thousands of hexes on screen at continent zoom.
  const centre = (q, r) => ({
    x: (worldWidth * (q + r / 2) + offsetX) * zoom + viewX,
    y: (rowStep * r + offsetY) * zoom + viewY,
  });

  // One path per colour rather than one polygon per hex: a travelled country is
  // hundreds of hexes in the same green, and that is hundreds of elements the
  // browser would lay out on every frame.
  const fills = new Map();
  if (cells?.forEach) {
    cells.forEach((painted) => {
      if (!painted?.color) return;
      const at = centre(painted.q, painted.r);
      if (at.x < -radius || at.x > width + radius) return;
      if (at.y < -radius || at.y > height + radius) return;
      const fillOpacity = painted.opacity ?? DEFAULT_FILL_OPACITY;
      const fillKey = `${painted.color}|${fillOpacity}`;
      const path = hexPath(at.x, at.y, radius);
      const group = fills.get(fillKey);
      if (group) group.d += path;
      else fills.set(fillKey, { color: painted.color, opacity: fillOpacity, d: path });
    });
  }

  let selectedPath = null;
  if (selected) {
    const at = centre(Math.round(selected.q), Math.round(selected.r));
    selectedPath = hexPath(at.x, at.y, radius);
  }

  let outlines = '';
  if (meshWorthDrawing) {
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
        outlines += hexHalfPath(cx, cy, radius);
      }
    }
  }

  if (!outlines && !fills.size && !selectedPath) return null;
  // Full strength while a hex is big enough to read, then down to a quarter as
  // it approaches the width of its own line.
  const fade = Math.min(1, Math.max(0.25, (screenWidth - MIN_VISIBLE_WIDTH)
    / (READABLE_WIDTH - MIN_VISIBLE_WIDTH)));
  return {
    outlines, meshOpacity: fade, fills: [...fills.entries()], selectedPath,
  };
}

function HexGrid({
  grid, view, viewportSize, cells = null, selected = null, opacity = 1,
  outlined = true, lineColor = 'rgba(232,201,106,0.28)', lineWidth = 1,
}) {
  const width = Math.max(0, Number(viewportSize?.width) || 0);
  const height = Math.max(0, Number(viewportSize?.height) || 0);
  const geometry = useMemo(
    () => buildGeometry({ grid, view, width, height, cells, selected, outlined }),
    [cells, grid, height, outlined, selected, view, width],
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

      {geometry.outlines ? (
        <path
          d={geometry.outlines}
          fill="none"
          stroke={lineColor}
          strokeWidth={lineWidth}
          strokeOpacity={geometry.meshOpacity}
        />
      ) : null}

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
