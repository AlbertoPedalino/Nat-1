import { useEffect, useRef } from 'react';
import { Box } from '@mui/material';
import { AREA_EFFECTS, areaGeometry } from '../../../shared/vtt/map/areas.js';
import { cellSize, worldToScreen } from '../../../shared/vtt/map/geometry.js';
import { createProgram, shaderSeconds } from '../atmosphere/AtmosphereOverlay.jsx';
import { releaseContext, useContextRecovery } from '../atmosphere/webglCanvas.js';
import { AREA_FRAGMENT_SHADER, AREA_SHAPE_INDEX, AREA_VERTEX_SHADER } from './areaEffectShader.js';

// The animated insides of the areas that carry an effect (fire, poison…). Its
// own canvas, under the drawing canvas so outlines and labels stay on top, and
// under the fog and the pieces like any other mark. Without WebGL it draws
// nothing and the areas keep their outline and label.
export default function AreaEffectsCanvas({ drawings, grid, view }) {
  const canvasRef = useRef(null);
  const drawRef = useRef(null);
  const effects = (drawings || []).filter((drawing) => drawing?.area?.effect);
  const stateRef = useRef({ effects, grid, view });
  stateRef.current = { effects, grid, view };
  const active = effects.length > 0;
  const { generation, failed, recover } = useContextRecovery();

  useEffect(() => {
    if (!active) return undefined;
    const canvas = canvasRef.current;
    const gl = canvas?.getContext('webgl', {
      alpha: true,
      antialias: false,
      depth: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: false,
    });
    if (!gl) return undefined;
    const program = createProgram(gl, AREA_VERTEX_SHADER, AREA_FRAGMENT_SHADER);
    if (!program) return undefined;

    const buffer = gl.createBuffer();
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    const position = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    const uniform = (name) => gl.getUniformLocation(program, name);
    const uniforms = {
      resolution: uniform('u_resolution'),
      origin: uniform('u_origin'),
      reach: uniform('u_reach'),
      angle: uniform('u_angle'),
      breadth: uniform('u_breadth'),
      shape: uniform('u_shape'),
      effect: uniform('u_effect'),
      time: uniform('u_time'),
      cell: uniform('u_cell'),
      seed: uniform('u_seed'),
      opacity: uniform('u_opacity'),
    };
    const reducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
    let frame = 0;
    let lastFrame = 0;
    let running = false;

    const draw = (timestamp = 0) => {
      const host = canvas.parentElement;
      const width = host?.clientWidth || 0;
      const height = host?.clientHeight || 0;
      if (!width || !height) return;
      // Soft, noisy textures: a full-resolution backing store buys nothing.
      const scale = Math.min(globalThis.devicePixelRatio || 1, 1.25) * 0.75;
      const pixelWidth = Math.max(1, Math.round(width * scale));
      const pixelHeight = Math.max(1, Math.round(height * scale));
      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth;
        canvas.height = pixelHeight;
      }
      gl.viewport(0, 0, pixelWidth, pixelHeight);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(program);
      gl.uniform2f(uniforms.resolution, width, height);
      gl.uniform1f(uniforms.time, reducedMotion?.matches ? 7 : shaderSeconds());

      const { effects: shown, grid: currentGrid, view: currentView } = stateRef.current;
      const cell = cellSize(currentGrid) * currentView.zoom;
      gl.uniform1f(uniforms.cell, cell);
      for (const drawing of shown) {
        const geometry = areaGeometry(drawing);
        const effectIndex = AREA_EFFECTS.findIndex((effect) => effect.key === drawing.area.effect) + 1;
        if (!geometry || !effectIndex) continue;
        const at = worldToScreen({
          x: geometry.origin.x * cellSize(currentGrid) + (currentGrid.offsetX || 0),
          y: geometry.origin.y * cellSize(currentGrid) + (currentGrid.offsetY || 0),
        }, currentView);
        const reach = geometry.reach * cell;
        const breadth = geometry.breadth * cell;
        // Enough to hold a square's corners and a line's width, plus the soft edge.
        const half = reach * 1.42 + breadth / 2 + cell * 0.2;
        if (at.x + half < 0 || at.y + half < 0 || at.x - half > width || at.y - half > height) continue;
        const left = at.x - half;
        const right = at.x + half;
        const top = at.y - half;
        const bottom = at.y + half;
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
          left, top, right, top, left, bottom,
          left, bottom, right, top, right, bottom,
        ]), gl.DYNAMIC_DRAW);
        gl.uniform2f(uniforms.origin, at.x, at.y);
        gl.uniform1f(uniforms.reach, reach);
        gl.uniform1f(uniforms.angle, geometry.angle);
        gl.uniform1f(uniforms.breadth, breadth);
        gl.uniform1f(uniforms.shape, AREA_SHAPE_INDEX[drawing.area.shape] ?? 0);
        gl.uniform1f(uniforms.effect, effectIndex);
        gl.uniform1f(uniforms.seed, seedFor(drawing.id));
        // Matches the outline: an area the players cannot see is drawn faint.
        gl.uniform1f(uniforms.opacity, drawing.hiddenFromPlayers ? 0.45 : 1);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      }
      lastFrame = timestamp;
    };

    const stop = () => {
      running = false;
      cancelAnimationFrame(frame);
    };
    const loop = (timestamp) => {
      if (!running) return;
      if (timestamp - lastFrame >= 32) draw(timestamp);
      frame = requestAnimationFrame(loop);
    };
    const start = () => {
      stop();
      draw();
      if (!document.hidden && !reducedMotion?.matches) {
        running = true;
        frame = requestAnimationFrame(loop);
      }
    };
    const handleVisibility = () => (document.hidden ? stop() : start());
    const handleContextLost = (event) => {
      event.preventDefault();
      stop();
      recover();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    reducedMotion?.addEventListener?.('change', start);
    canvas.addEventListener('webglcontextlost', handleContextLost);
    drawRef.current = draw;
    start();

    return () => {
      stop();
      document.removeEventListener('visibilitychange', handleVisibility);
      reducedMotion?.removeEventListener?.('change', start);
      canvas.removeEventListener('webglcontextlost', handleContextLost);
      drawRef.current = null;
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      releaseContext(gl);
    };
  }, [active, generation, recover]);

  // A pan or a zoom lands in the same frame as the map, not on the next tick
  // of the animation.
  useEffect(() => {
    drawRef.current?.();
  }, [drawings, grid, view]);

  if (!active || failed) return null;
  return <Box component="canvas" key={generation} ref={canvasRef} aria-hidden data-area-effects sx={canvasSx} />;
}

// A stable per-area offset into the noise, so two fires side by side do not
// flicker in step.
function seedFor(id) {
  let value = 0;
  for (const char of String(id || '')) value = (value * 31 + char.charCodeAt(0)) % 9973;
  return value / 7.3;
}

const canvasSx = {
  position: 'absolute',
  inset: 0,
  pointerEvents: 'none',
  width: '100%',
  height: '100%',
};
