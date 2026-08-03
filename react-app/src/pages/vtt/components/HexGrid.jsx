import { Box } from '@mui/material';
import {
  hexCorners, hexWidth, hexKey, hexesInRect,
} from '../../../shared/vtt/hexGeometry.js';
import { screenToWorld, worldToScreen } from '../../../shared/vtt/geometry.js';

// The hex overlay. An SVG rather than the CSS gradient the square grid uses:
// hexes interlock, so there is no repeating tile that draws them.
//
// Only the hexes the viewport covers are built, and only while they are big
// enough to see — a wilderness map zoomed out to the whole continent would
// otherwise ask for tens of thousands of paths nobody can make out.
const MIN_VISIBLE_WIDTH = 8;
const MAX_HEXES = 4000;

export default function HexGrid({
  grid, view, viewportSize, cells = null, selected = null, opacity = 1,
}) {
  const width = Math.max(0, Number(viewportSize?.width) || 0);
  const height = Math.max(0, Number(viewportSize?.height) || 0);
  const onScreenWidth = hexWidth(grid) * (Number(view?.zoom) || 1);
  if (!width || !height || onScreenWidth < MIN_VISIBLE_WIDTH) return null;

  const topLeft = screenToWorld({ x: 0, y: 0 }, view);
  const bottomRight = screenToWorld({ x: width, y: height }, view);
  const visible = hexesInRect({
    x: topLeft.x,
    y: topLeft.y,
    width: bottomRight.x - topLeft.x,
    height: bottomRight.y - topLeft.y,
  }, grid);
  if (visible.length > MAX_HEXES) return null;

  const points = (cell) => hexCorners(cell, grid)
    .map((corner) => {
      const at = worldToScreen(corner, view);
      return `${at.x.toFixed(1)},${at.y.toFixed(1)}`;
    })
    .join(' ');

  // One path for every outline: six hundred separate elements is six hundred
  // things for the browser to lay out on each pan.
  const outlines = visible.map((cell) => `M${points(cell).replace(/ /g, 'L')}Z`).join('');
  const selectedKey = selected ? hexKey(selected) : null;

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
      {cells
        ? visible.map((cell) => {
          const painted = cells.get?.(hexKey(cell));
          if (!painted?.color) return null;
          return (
            <polygon
              key={`fill-${hexKey(cell)}`}
              points={points(cell)}
              fill={painted.color}
              fillOpacity={painted.opacity ?? 0.42}
            />
          );
        })
        : null}

      <path d={outlines} fill="none" stroke="rgba(232,201,106,0.28)" strokeWidth={1} />

      {selectedKey ? (
        <polygon
          points={points(selected)}
          fill="none"
          stroke="rgba(232,201,106,0.95)"
          strokeWidth={2.5}
        />
      ) : null}
    </Box>
  );
}
