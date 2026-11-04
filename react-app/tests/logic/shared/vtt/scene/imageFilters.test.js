import test from 'node:test';
import assert from 'node:assert/strict';
import {
  imageFilterFor,
  imageFilterLook,
  normalizeImageFilter,
  normalizeImageFilters,
  withImageFilter,
} from '../../../../../src/shared/vtt/scene/imageFilters.js';

test('reads anything unknown as the picture shown as painted', () => {
  assert.deepEqual(normalizeImageFilter(null), { type: 'none', intensity: 1 });
  assert.deepEqual(normalizeImageFilter({ type: 'eclipse', intensity: 'x' }), { type: 'none', intensity: 1 });
  assert.deepEqual(normalizeImageFilter({ type: 'night', intensity: 0.02 }), { type: 'night', intensity: 0.1 });
  assert.deepEqual(normalizeImageFilter({ type: 'night', intensity: 0.83 }), { type: 'night', intensity: 0.85 });
});

test('keeps one entry per filtered picture and drops pictures left as painted', () => {
  assert.deepEqual(normalizeImageFilters({
    'a.png': { type: 'dusk', intensity: 0.5 },
    'b.png': { type: 'none' },
    '': { type: 'night' },
  }), { 'a.png': { type: 'dusk', intensity: 0.5 } });
  assert.deepEqual(normalizeImageFilters([{ type: 'night' }]), {});
});

test('prunes the pictures the scene no longer has when one is changed', () => {
  const filters = { 'old.png': { type: 'night', intensity: 1 } };
  assert.deepEqual(
    withImageFilter(filters, 'map.png', { type: 'sunset', intensity: 0.6 }, ['map.png', 'bg.png']),
    { 'map.png': { type: 'sunset', intensity: 0.6 } },
  );
  assert.deepEqual(
    withImageFilter({ 'map.png': { type: 'night', intensity: 1 } }, 'map.png', { type: 'none' }, ['map.png']),
    {},
  );
});

test('looks up the filter of one picture', () => {
  const filters = { 'bg.png': { type: 'night', intensity: 0.7 } };
  assert.deepEqual(imageFilterFor(filters, 'bg.png'), { type: 'night', intensity: 0.7 });
  assert.equal(imageFilterFor(filters, 'map.png').type, 'none');
  assert.equal(imageFilterFor(filters, null).type, 'none');
});

test('turns a filter into a CSS filter and a tint that scale with intensity', () => {
  assert.deepEqual(imageFilterLook({ type: 'none' }), { filter: null, tint: null });
  const full = imageFilterLook({ type: 'night', intensity: 1 });
  const half = imageFilterLook({ type: 'night', intensity: 0.5 });
  assert.match(full.filter, /brightness\(0\.55\)/);
  assert.match(half.filter, /brightness\(0\.775\)/);
  assert.ok(Math.abs(half.tint.opacity - full.tint.opacity / 2) < 0.001);
});
