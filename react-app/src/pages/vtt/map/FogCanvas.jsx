import { useLayoutEffect, useRef } from 'react';
import { Box } from '@mui/material';
import { useResizeTick } from './useResizeTick.js';
import { decodeCells, fogOrigin } from '../../../shared/vtt/map/fog.js';
import { cellSize, worldToScreen } from '../../../shared/vtt/map/geometry.js';
import { VTT_COLORS, vttAlpha } from '../../../shared/vtt/colors.js';

// Cover the entire viewport, then erase only explored cells using an offscreen
// mask. Blurring a finite rectangle of covered cells fades its outer edges and
// exposes the map border; blurring the reveal mask only softens explored edges.
export default function FogCanvas({ fog, grid, view, opacity, onTop = false }) {
  const canvasRef = useRef(null);
  // Redraw when the box changes: the canvas is measured in its own pixels.
  const resizeTick = useResizeTick(canvasRef);
  const bufferRef = useRef(null);

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

    // Match the backing store to the CSS size so the fog is not blurry on HiDPI.
    const ratio = window.devicePixelRatio || 1;
    const pixelWidth = Math.ceil(width * ratio);
    const pixelHeight = Math.ceil(height * ratio);
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }

    const context = canvas.getContext('2d');
    if (!context) return;
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, pixelWidth, pixelHeight);
    if (!fog) return;

    // Paint in backing-store pixels so fractional device ratios cannot leave
    // a translucent last row/column. Everything outside saved fog is covered
    // too, including grid-offset margins and maps larger than an old fog mask.
    context.fillStyle = vttAlpha(VTT_COLORS.black, opacity);
    context.fillRect(0, 0, pixelWidth, pixelHeight);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);

    const { cols, rows } = fog;
    let buffer = bufferRef.current;
    if (!buffer || buffer.width !== cols || buffer.height !== rows) {
      buffer = document.createElement('canvas');
      buffer.width = cols;
      buffer.height = rows;
      bufferRef.current = buffer;
    }
    const bufferContext = buffer.getContext('2d');
    if (!bufferContext) return;

    const bytes = decodeCells(fog.cells, Math.ceil((cols * rows) / 8));
    const image = bufferContext.createImageData(cols, rows);
    for (let index = 0; index < cols * rows; index += 1) {
      const revealed = bytes[index >> 3] & (1 << (index & 7));
      // The mask removes fog only where the GM explicitly revealed a cell.
      image.data[index * 4 + 3] = revealed ? 255 : 0;
    }
    bufferContext.putImageData(image, 0, 0);

    // A fog cell is a fraction of a grid square, so the buffer is scaled by the
    // cell size divided by that fraction.
    const size = cellSize(grid) / Math.max(1, fog.scale || 1);
    const origin = worldToScreen(fogOrigin(grid), view);
    // Smoothing on: at four fog cells to a square the edge is fine enough that
    // interpolating reads as a soft edge of light, while nearest-neighbour would
    // show the staircase a round brush is meant to avoid.
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.globalCompositeOperation = 'destination-out';
    // A fraction of one fog cell softens diagonal stair steps, including fog
    // saved at older resolutions. Scale with the map and backing-store ratio
    // so zooming and HiDPI displays keep the same edge softness in world space.
    context.filter = `blur(${size * view.zoom * ratio * 0.35}px)`;
    context.drawImage(
      buffer,
      origin.x,
      origin.y,
      cols * size * view.zoom,
      rows * size * view.zoom,
    );
    context.filter = 'none';
    context.globalCompositeOperation = 'source-over';
  }, [fog, grid, opacity, view, resizeTick]);

  return (
    <Box
      component="canvas"
      ref={canvasRef}
      aria-hidden
      data-fog-layer={onTop ? 'public' : 'gm'}
      sx={{ ...canvasSx, ...(onTop ? publicFogSx : null) }}
    />
  );
}

const canvasSx = {
  position: 'absolute',
  inset: 0,
  pointerEvents: 'none',
  width: '100%',
  height: '100%',
};

// Public fog sits above persistent map content. Atmosphere and interactive
// overlays follow at this layer in paint order; controls sit above them.
const publicFogSx = { zIndex: 4 };
