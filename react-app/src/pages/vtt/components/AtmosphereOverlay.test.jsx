import { render, waitFor } from '@testing-library/react';
import { afterEach, vi } from 'vitest';
import { ATMOSPHERE_TYPES } from '../../../shared/vtt/atmosphere.js';
import AtmosphereOverlay from './AtmosphereOverlay.jsx';
import { getAtmosphereFragmentShader } from './atmosphere/index.js';

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
