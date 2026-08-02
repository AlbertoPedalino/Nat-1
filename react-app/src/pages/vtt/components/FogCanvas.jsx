import { useEffect, useRef } from 'react';
import { Box } from '@mui/material';
import { decodeCells } from '../../../shared/vtt/fog.js';
import { cellSize, worldToScreen } from '../../../shared/vtt/geometry.js';

// The fog is painted at one pixel per cell on an offscreen canvas and then
// scaled up with smoothing off. Filling ten thousand rectangles on every brush
// frame is the obvious way to write this and the slow one; this way a stroke
// costs a few thousand byte writes and one drawImage.
export default function FogCanvas({ fog, grid, view, opacity }) {
  const canvasRef = useRef(null);
  const bufferRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const host = canvas.parentElement;
    const width = host?.clientWidth || 0;
    const height = host?.clientHeight || 0;
    if (!width || !height) return;

    // Match the backing store to the CSS size so the fog is not blurry on HiDPI.
    const ratio = window.devicePixelRatio || 1;
    if (canvas.width !== width * ratio || canvas.height !== height * ratio) {
      canvas.width = width * ratio;
      canvas.height = height * ratio;
    }

    const context = canvas.getContext('2d');
    if (!context) return;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, height);
    if (!fog) return;

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
    const alpha = Math.round(Math.max(0, Math.min(1, opacity)) * 255);
    for (let index = 0; index < cols * rows; index += 1) {
      const revealed = bytes[index >> 3] & (1 << (index & 7));
      // Black where the cell is still covered, fully transparent where explored.
      image.data[index * 4 + 3] = revealed ? 0 : alpha;
    }
    bufferContext.putImageData(image, 0, 0);

    const size = cellSize(grid);
    const origin = worldToScreen({ x: grid.offsetX, y: grid.offsetY }, view);
    context.imageSmoothingEnabled = false;
    context.drawImage(
      buffer,
      origin.x,
      origin.y,
      cols * size * view.zoom,
      rows * size * view.zoom,
    );
  }, [fog, grid, opacity, view]);

  return <Box component="canvas" ref={canvasRef} aria-hidden sx={canvasSx} />;
}

const canvasSx = {
  position: 'absolute',
  inset: 0,
  pointerEvents: 'none',
  width: '100%',
  height: '100%',
};
