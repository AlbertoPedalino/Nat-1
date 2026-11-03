import { describe, expect, it } from 'vitest';
import {
  imageFilterFor,
  imageFilterLook,
  normalizeImageFilter,
  normalizeImageFilters,
  withImageFilter,
} from '../../../../../src/shared/vtt/scene/imageFilters.js';

describe('image light filters', () => {
  it('reads anything unknown as the picture shown as painted', () => {
    expect(normalizeImageFilter(null)).toEqual({ type: 'none', intensity: 1 });
    expect(normalizeImageFilter({ type: 'eclipse', intensity: 'x' })).toEqual({ type: 'none', intensity: 1 });
    expect(normalizeImageFilter({ type: 'night', intensity: 0.02 })).toEqual({ type: 'night', intensity: 0.1 });
    expect(normalizeImageFilter({ type: 'night', intensity: 0.83 })).toEqual({ type: 'night', intensity: 0.85 });
  });

  it('keeps one entry per filtered picture and drops pictures left as painted', () => {
    expect(normalizeImageFilters({
      'a.png': { type: 'dusk', intensity: 0.5 },
      'b.png': { type: 'none' },
      '': { type: 'night' },
    })).toEqual({ 'a.png': { type: 'dusk', intensity: 0.5 } });
    expect(normalizeImageFilters([{ type: 'night' }])).toEqual({});
  });

  it('prunes the pictures the scene no longer has when one is changed', () => {
    const filters = { 'old.png': { type: 'night', intensity: 1 } };
    expect(withImageFilter(filters, 'map.png', { type: 'sunset', intensity: 0.6 }, ['map.png', 'bg.png']))
      .toEqual({ 'map.png': { type: 'sunset', intensity: 0.6 } });
    expect(withImageFilter({ 'map.png': { type: 'night', intensity: 1 } }, 'map.png', { type: 'none' }, ['map.png']))
      .toEqual({});
  });

  it('looks up the filter of one picture', () => {
    const filters = { 'bg.png': { type: 'night', intensity: 0.7 } };
    expect(imageFilterFor(filters, 'bg.png')).toEqual({ type: 'night', intensity: 0.7 });
    expect(imageFilterFor(filters, 'map.png').type).toBe('none');
    expect(imageFilterFor(filters, null).type).toBe('none');
  });

  it('turns a filter into a CSS filter and a tint that scale with intensity', () => {
    expect(imageFilterLook({ type: 'none' })).toEqual({ filter: null, tint: null });
    const full = imageFilterLook({ type: 'night', intensity: 1 });
    const half = imageFilterLook({ type: 'night', intensity: 0.5 });
    expect(full.filter).toContain('brightness(0.55)');
    expect(half.filter).toContain('brightness(0.775)');
    expect(half.tint.opacity).toBeCloseTo(full.tint.opacity / 2, 3);
  });
});
