import { act, render, waitFor } from '@testing-library/react';
import { afterEach, vi } from 'vitest';
import { ATMOSPHERE_TYPES } from '../../../../../src/shared/vtt/scene/atmosphere.js';
import AtmosphereOverlay, { atmosphereRenderScale } from '../../../../../src/pages/vtt/atmosphere/AtmosphereOverlay.jsx';
import { getAtmosphereFragmentShader } from '../../../../../src/pages/vtt/atmosphere/shaders/index.js';

afterEach(() => vi.restoreAllMocks());

test('disabled atmosphere mounts no rendering surface', () => {
  const { container } = render(<AtmosphereOverlay atmosphere={{ type: 'none' }} />);
  expect(container.querySelector('[data-atmosphere-overlay]')).toBeNull();
});

test('atmosphere keeps a static fallback without WebGL', async () => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  const { container } = render(<AtmosphereOverlay atmosphere={{ type: 'fog', intensity: 0.8 }} />);

  await waitFor(() => {
    const overlay = container.querySelector('[data-atmosphere-overlay="fog"]');
    expect(overlay).not.toBeNull();
    expect(overlay.tagName).toBe('DIV');
  });
});

test.each(['snow', 'fire', 'heatwave', 'sunrays', 'swamp', 'haunted', 'goldvault'])('%s has a static fallback without WebGL', async (type) => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  const { container } = render(<AtmosphereOverlay atmosphere={{ type, intensity: 0.8 }} />);

  await waitFor(() => {
    expect(container.querySelector(`[data-atmosphere-overlay="${type}"]`)).not.toBeNull();
  });
});

test('every enabled atmosphere owns an independent fragment shader', () => {
  ATMOSPHERE_TYPES.filter((type) => type !== 'none').forEach((type) => {
    expect(getAtmosphereFragmentShader(type)).toContain('void main()');
  });
  expect(getAtmosphereFragmentShader('none')).toBeNull();
});

test('heatwave uses a reduced render scale for its expensive fragment shader', () => {
  expect(atmosphereRenderScale('heatwave')).toBeLessThan(atmosphereRenderScale('sunrays'));
});

test('heatwave avoids the expensive multi-cell dust search and FBM noise', () => {
  const shader = getAtmosphereFragmentShader('heatwave');
  expect(shader).not.toContain('heatDustLayer');
  // The shared shader prelude defines fbm for other presets, but Heatwave must
  // not call it from its own helpers or body.
  expect(shader.match(/\bfbm\(/g)).toHaveLength(1);
});

// Enough of a WebGL context for the renderer to set itself up and draw.
function fakeContext() {
  const lose = { loseContext: vi.fn() };
  const gl = new Proxy({
    isContextLost: () => false,
    getExtension: (name) => (name === 'WEBGL_lose_context' ? lose : null),
    getShaderParameter: () => true,
    getProgramParameter: () => true,
  }, {
    get: (target, key) => (key in target ? target[key] : (typeof key === 'string' && /^[A-Z_]+$/.test(key) ? 1 : () => ({}))),
  });
  return { gl, lose };
}

// A browser takes the oldest WebGL context away when too many are open. The
// weather then broke for the rest of the evening, until it was switched off and
// on again; it now starts again on a new canvas by itself, and gives its
// context back as soon as its canvas goes.
test('a lost context starts the weather again on a new canvas, and contexts are given back', async () => {
  vi.useFakeTimers();
  try {
    const contexts = [];
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => {
      const context = fakeContext();
      contexts.push(context);
      return context.gl;
    });
    vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation(() => 0);
    const { container, unmount } = render(<AtmosphereOverlay atmosphere={{ type: 'rain', intensity: 0.8 }} />);
    const first = container.querySelector('canvas[data-atmosphere-overlay="rain"]');
    expect(contexts).toHaveLength(1);

    act(() => {
      const lost = new Event('webglcontextlost', { cancelable: true });
      first.dispatchEvent(lost);
    });
    await act(async () => { vi.advanceTimersByTime(500); });

    const second = container.querySelector('canvas[data-atmosphere-overlay="rain"]');
    expect(second).not.toBe(first);
    expect(contexts).toHaveLength(2);
    expect(contexts[0].lose.loseContext).toHaveBeenCalled();

    unmount();
    expect(contexts[1].lose.loseContext).toHaveBeenCalled();
  } finally {
    vi.useRealTimers();
  }
});
