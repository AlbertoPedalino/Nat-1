import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ATMOSPHERE_TYPES, DEFAULT_ATMOSPHERE, atmosphereFor, normalizeAtmosphere, normalizeImageAtmospheres,
  withImageAtmosphere,
} from '../../../../../src/shared/vtt/scene/atmosphere.js';

test('missing atmosphere is safely disabled', () => {
  assert.deepEqual(normalizeAtmosphere(null), DEFAULT_ATMOSPHERE);
  assert.equal(normalizeAtmosphere({ type: 'meteor-shower' }).type, 'none');
});

test('atmosphere controls are bounded and rounded before storage', () => {
  assert.deepEqual(normalizeAtmosphere({
    type: 'storm', intensity: 2, direction: -15, speed: 0, seed: -2,
  }), {
    type: 'storm', intensity: 1, direction: 345, speed: 0.25, seed: 1,
  });
  assert.equal(normalizeAtmosphere({ intensity: 0.678 }).intensity, 0.7);
  assert.equal(normalizeAtmosphere({ speed: 1.38 }).speed, 1.5);
});

test('the stored atmosphere catalog is unique and contains every preset', () => {
  assert.equal(new Set(ATMOSPHERE_TYPES).size, ATMOSPHERE_TYPES.length);
  assert.ok(ATMOSPHERE_TYPES.includes('snow'));
  assert.ok(ATMOSPHERE_TYPES.includes('fire'));
  assert.ok(ATMOSPHERE_TYPES.includes('heatwave'));
  assert.ok(ATMOSPHERE_TYPES.includes('sunrays'));
  assert.ok(ATMOSPHERE_TYPES.includes('wind'));
  assert.ok(ATMOSPHERE_TYPES.includes('swamp'));
  assert.ok(ATMOSPHERE_TYPES.includes('haunted'));
  assert.ok(ATMOSPHERE_TYPES.includes('goldvault'));
});

test('each picture keeps its own atmosphere and a clear sky is no entry', () => {
  const atmospheres = withImageAtmosphere({}, 'map.png', { type: 'storm', intensity: 0.8 }, ['map.png', 'bg.png']);
  assert.equal(atmosphereFor(atmospheres, 'map.png').type, 'storm');
  assert.equal(atmosphereFor(atmospheres, 'bg.png').type, 'none', 'the background stays dry');
  assert.equal(atmosphereFor(atmospheres, null).type, 'none');

  const cleared = withImageAtmosphere(atmospheres, 'map.png', { type: 'none' }, ['map.png', 'bg.png']);
  assert.deepEqual(cleared, {});
});

test('atmospheres of pictures no longer in the scene are pruned', () => {
  const stored = { 'old.png': { type: 'rain' }, 'bg.png': { type: 'snow' }, '': { type: 'fog' } };
  assert.deepEqual(Object.keys(normalizeImageAtmospheres(stored)), ['old.png', 'bg.png']);
  const next = withImageAtmosphere(stored, 'map.png', { type: 'wind' }, ['map.png', 'bg.png']);
  assert.deepEqual(Object.keys(next).sort(), ['bg.png', 'map.png']);
  assert.deepEqual(normalizeImageAtmospheres(['rain']), {});
});
