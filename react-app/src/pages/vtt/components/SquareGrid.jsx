import { memo, useId, useMemo } from 'react';
import { Box } from '@mui/material';
import { cellSize, worldToScreen } from '../../../shared/vtt/geometry.js';

// CSS repeating backgrounds quantise the tile size and its position separately.
// At fractional zooms that makes the mesh slip by a pixel while tokens, which
// use map coordinates, remain in the right place. A single SVG path keeps every
// line in the same screen-space transform as the pieces without adding one DOM
// node per line.
function squarePath(grid, view, width, height) {
  const step = cellSize(grid) * (Number(view?.zoom) || 1);
  // SceneViewport uses the same readability cut-off. Keeping it here too makes
  // the component safe in isolation: a corrupt near-zero step must not build
  // millions of path segments.
  if (!(step > 4) || !width || !height) return '';

  const origin = worldToScreen({
    x: Number(grid?.offsetX) || 0,
    y: Number(grid?.offsetY) || 0,
  }, view);
  const firstX = ((origin.x % step) + step) % step;
  const firstY = ((origin.y % step) + step) % step;
  const segments = [];

  for (let x = firstX; x <= width; x += step) segments.push(`M${x} 0V${height}`);
  for (let y = firstY; y <= height; y += step) segments.push(`M0 ${y}H${width}`);
  return segments.join('');
}

function SquareGrid({
  grid,
  view,
  viewportSize,
  lineColor,
  lineWidth = 1,
  clipRect = null,
}) {
  const clipId = `squaregrid-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const width = Math.max(0, Number(viewportSize?.width) || 0);
  const height = Math.max(0, Number(viewportSize?.height) || 0);
  const path = useMemo(
    () => squarePath(grid, view, width, height),
    [grid, height, view, width],
  );

  if (!path) return null;

  return (
    <Box
      component="svg"
      aria-hidden
      data-square-grid
      width={width}
      height={height}
      sx={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
    >
      {clipRect ? (
        <defs>
          <clipPath id={clipId}>
            <rect
              x={clipRect.left}
              y={clipRect.top}
              width={Math.max(0, clipRect.width)}
              height={Math.max(0, clipRect.height)}
            />
          </clipPath>
        </defs>
      ) : null}
      <path
        d={path}
        fill="none"
        stroke={lineColor}
        strokeWidth={lineWidth}
        clipPath={clipRect ? `url(#${clipId})` : undefined}
      />
    </Box>
  );
}

export default memo(SquareGrid);
