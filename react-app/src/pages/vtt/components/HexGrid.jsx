import { memo, useId, useMemo } from 'react';
import { Box } from '@mui/material';
import { hexHeight, hexRowStep, hexWidth } from '../../../shared/vtt/hexGeometry.js';

// The hex overlay.
//
// The mesh is one repeating tile rather than a path per hex. A hex lattice is
// periodic — every hex width across, every two rows down — so the browser can
// tile it, and drawing it costs the same whether four hexes are on screen or
// forty thousand. Building it hex by hex meant a budget, and a budget meant the
// grid vanished the moment a GM zoomed out to look at the whole map, which is
// exactly when they were looking at the country rather than at one fight.
//
// The painted hexes and the picked one are still drawn individually: those come
// from what the campaign has recorded, which is hundreds of rows at most, and
// they must survive any zoom because they are the map's content.
//
// Below this width a hex is thinner than the line drawing it. The mesh fades
// towards it rather than switching off at some threshold.
const MIN_TILE = 2;
const READABLE_WIDTH = 16;
const DEFAULT_FILL_OPACITY = 0.42;

// The six corners of a pointy-top hex on the unit circle, clockwise from the
// top. Constant: only the radius and the centre change per hex.
const UNIT_CORNERS = Array.from({ length: 6 }, (_, index) => {
  const angle = (Math.PI / 180) * (60 * index - 90);
  return { cos: Math.cos(angle), sin: Math.sin(angle) };
});

// Two decimals: fine enough that a tile seam never shows, short enough to keep
// the path strings small.
const round = (value) => Math.round(value * 100) / 100;

function hexPath(cx, cy, radius) {
  let d = '';
  for (let index = 0; index < 6; index += 1) {
    const corner = UNIT_CORNERS[index];
    d += `${index === 0 ? 'M' : 'L'}${round(cx + radius * corner.cos)},${round(cy + radius * corner.sin)}`;
  }
  return `${d}Z`;
}

// Only the right-hand half of a hex: top, upper right, lower right, bottom.
// Every edge of the lattice is the right-hand edge of exactly one hex, so
// repeating this draws the mesh whole and draws no edge twice.
function hexHalfPath(cx, cy, radius) {
  let d = '';
  for (let index = 0; index < 4; index += 1) {
    const corner = UNIT_CORNERS[index];
    d += `${index === 0 ? 'M' : 'L'}${round(cx + radius * corner.cos)},${round(cy + radius * corner.sin)}`;
  }
  return d;
}

// One period of the lattice: a hex at the tile's corner and its neighbour half a
// width along and one row down. Both are repeated into the eight tiles around
// this one, because a pattern clips its contents and the halves that hang over
// the edge have to be drawn by the tile they hang into.
function tilePath(tileWidth, tileHeight, radius) {
  const rowStep = tileHeight / 2;
  let d = '';
  for (let dx = -1; dx <= 1; dx += 1) {
    for (let dy = -1; dy <= 1; dy += 1) {
      const x = dx * tileWidth;
      const y = dy * tileHeight;
      d += hexHalfPath(x, y, radius);
      d += hexHalfPath(x + tileWidth / 2, y + rowStep, radius);
    }
  }
  return d;
}

function buildGeometry({ grid, view, width, height, cells, selected, outlined }) {
  const zoom = Number(view?.zoom) || 1;
  if (!width || !height) return null;

  const worldWidth = hexWidth(grid);
  const offsetX = Number(grid?.offsetX) || 0;
  const offsetY = Number(grid?.offsetY) || 0;
  const rowStep = hexRowStep(grid);
  const radius = (hexHeight(grid) / 2) * zoom;
  const viewX = Number(view?.x) || 0;
  const viewY = Number(view?.y) || 0;

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

  const selectedPath = selected
    ? (() => {
      const at = centre(Math.round(selected.q), Math.round(selected.r));
      return hexPath(at.x, at.y, radius);
    })()
    : null;

  const tileWidth = worldWidth * zoom;
  const tileHeight = rowStep * 2 * zoom;
  let mesh = null;
  if (outlined && tileWidth >= MIN_TILE) {
    // Where hex (0, 0) lands, folded back into the first tile: the pattern
    // repeats from there, so the lattice stays nailed to the map through every
    // pan instead of sliding against it.
    const origin = centre(0, 0);
    mesh = {
      tileWidth,
      tileHeight,
      x: ((origin.x % tileWidth) + tileWidth) % tileWidth,
      y: ((origin.y % tileHeight) + tileHeight) % tileHeight,
      d: tilePath(tileWidth, tileHeight, radius),
      // Full strength while a hex is big enough to read, then down to a third as
      // it approaches the width of its own line.
      opacity: Math.min(1, Math.max(0.33, tileWidth / READABLE_WIDTH)),
    };
  }

  if (!mesh && !fills.size && !selectedPath) return null;
  return { mesh, fills: [...fills.entries()], selectedPath };
}

function HexGrid({
  grid, view, viewportSize, cells = null, selected = null, opacity = 1,
  outlined = true, lineColor = 'rgba(232,201,106,0.28)', lineWidth = 1,
}) {
  // React's ids carry colons, which a `url(#…)` reference cannot: the paint
  // server would silently resolve to nothing and the mesh would be invisible in
  // the browser while every test still passed.
  const patternId = `hexgrid-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const width = Math.max(0, Number(viewportSize?.width) || 0);
  const height = Math.max(0, Number(viewportSize?.height) || 0);
  const geometry = useMemo(
    () => buildGeometry({ grid, view, width, height, cells, selected, outlined }),
    [cells, grid, height, outlined, selected, view, width],
  );

  if (!geometry) return null;
  const { mesh } = geometry;

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
      {mesh ? (
        <defs>
          <pattern
            id={patternId}
            patternUnits="userSpaceOnUse"
            width={mesh.tileWidth}
            height={mesh.tileHeight}
            x={mesh.x}
            y={mesh.y}
          >
            <path
              d={mesh.d}
              fill="none"
              stroke={lineColor}
              strokeWidth={lineWidth}
              strokeOpacity={mesh.opacity}
            />
          </pattern>
        </defs>
      ) : null}

      {/* Painted hexes go over the mesh's tile but under its lines is not worth
          the layering: the fill is translucent, so the grid reads through it. */}
      {geometry.fills.map(([key, fill]) => (
        <path key={key} d={fill.d} fill={fill.color} fillOpacity={fill.opacity} />
      ))}

      {mesh ? <rect width={width} height={height} fill={`url(#${patternId})`} /> : null}

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
