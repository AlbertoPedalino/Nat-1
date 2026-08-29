import { useEffect, useRef, useState } from 'react';
import { Box } from '@mui/material';
import { normalizeAtmosphere } from '../../../shared/vtt/atmosphere.js';
import { ATMOSPHERE_VERTEX_SHADER } from './atmosphere/common.js';
import { atmosphereFallbackSx } from './atmosphere/fallback.js';
import { getAtmosphereFragmentShader } from './atmosphere/index.js';

// The renderer owns one low-resolution fullscreen triangle. Each atmosphere keeps
// its own fragment shader module, so changing one effect cannot alter another.
export default function AtmosphereOverlay({ atmosphere }) {
  const canvasRef = useRef(null);
  const drawRef = useRef(null);
  const [fallback, setFallback] = useState(false);
  const config = normalizeAtmosphere(atmosphere);
  const configRef = useRef(config);
  configRef.current = config;
  const fragmentShader = getAtmosphereFragmentShader(config.type);
  const enabled = Boolean(fragmentShader);

  useEffect(() => {
    if (!enabled) setFallback(false);
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return undefined;
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const gl = canvas.getContext('webgl', {
      alpha: true,
      antialias: false,
      depth: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: false,
    });
    if (!gl) {
      setFallback(true);
      return undefined;
    }
    const program = createProgram(gl, ATMOSPHERE_VERTEX_SHADER, fragmentShader);
    if (!program) {
      setFallback(true);
      return undefined;
    }
    setFallback(false);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.useProgram(program);
    const position = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    const uniforms = {
      resolution: gl.getUniformLocation(program, 'u_resolution'),
      time: gl.getUniformLocation(program, 'u_time'),
      intensity: gl.getUniformLocation(program, 'u_intensity'),
      angle: gl.getUniformLocation(program, 'u_angle'),
      speed: gl.getUniformLocation(program, 'u_speed'),
      seed: gl.getUniformLocation(program, 'u_seed'),
    };
    const reducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
    let frame = 0;
    let lastFrame = 0;
    let running = false;

    const resize = () => {
      const host = canvas.parentElement;
      const width = host?.clientWidth || canvas.clientWidth || 1;
      const height = host?.clientHeight || canvas.clientHeight || 1;
      // Tiny radial motes need enough samples to remain circular instead of
      // collapsing into square pixels on the reduced-resolution canvas.
      const detailScale = ['sunrays', 'swamp', 'haunted'].includes(configRef.current.type) ? 0.82 : 0.55;
      const scale = Math.min(globalThis.devicePixelRatio || 1, 1.25) * detailScale;
      const nextWidth = Math.max(1, Math.round(width * scale));
      const nextHeight = Math.max(1, Math.round(height * scale));
      if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
        canvas.width = nextWidth;
        canvas.height = nextHeight;
        gl.viewport(0, 0, nextWidth, nextHeight);
      }
    };

    const draw = (timestamp = 0) => {
      resize();
      const active = configRef.current;
      const seconds = reducedMotion?.matches
        ? active.seed * 0.17
        : ((Date.now() / 1000) % 4096);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(program);
      gl.uniform2f(uniforms.resolution, canvas.width, canvas.height);
      gl.uniform1f(uniforms.time, seconds);
      gl.uniform1f(uniforms.intensity, active.intensity);
      gl.uniform1f(uniforms.angle, (active.direction * Math.PI) / 180);
      gl.uniform1f(uniforms.speed, active.speed);
      gl.uniform1f(uniforms.seed, active.seed);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
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
      setFallback(true);
    };
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(() => draw()) : null;
    observer?.observe(canvas.parentElement || canvas);
    const handleResize = () => draw();
    globalThis.addEventListener?.('resize', handleResize);
    document.addEventListener('visibilitychange', handleVisibility);
    reducedMotion?.addEventListener?.('change', start);
    canvas.addEventListener('webglcontextlost', handleContextLost);
    drawRef.current = draw;
    start();

    return () => {
      stop();
      observer?.disconnect();
      globalThis.removeEventListener?.('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibility);
      reducedMotion?.removeEventListener?.('change', start);
      canvas.removeEventListener('webglcontextlost', handleContextLost);
      drawRef.current = null;
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    };
  }, [enabled, fragmentShader]);

  useEffect(() => {
    drawRef.current?.();
  }, [config.direction, config.intensity, config.seed, config.speed, config.type]);

  if (!enabled) return null;
  if (fallback) {
    return (
      <Box
        aria-hidden
        data-atmosphere-overlay={config.type}
        sx={{ ...overlaySx, ...atmosphereFallbackSx(config) }}
      />
    );
  }
  return (
    <Box
      component="canvas"
      ref={canvasRef}
      aria-hidden
      data-atmosphere-overlay={config.type}
      sx={{
        ...overlaySx,
        ...(['sunrays', 'goldvault'].includes(config.type) ? { mixBlendMode: 'screen' } : {}),
      }}
    />
  );
}

function createProgram(gl, vertexSource, fragmentSource) {
  const compile = (type, source) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
    gl.deleteShader(shader);
    return null;
  };
  const vertex = compile(gl.VERTEX_SHADER, vertexSource);
  const fragment = compile(gl.FRAGMENT_SHADER, fragmentSource);
  if (!vertex || !fragment) {
    if (vertex) gl.deleteShader(vertex);
    if (fragment) gl.deleteShader(fragment);
    return null;
  }
  const program = gl.createProgram();
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (gl.getProgramParameter(program, gl.LINK_STATUS)) return program;
  gl.deleteProgram(program);
  return null;
}

const overlaySx = {
  position: 'absolute',
  inset: 0,
  zIndex: 3,
  width: '100%',
  height: '100%',
  pointerEvents: 'none',
};
