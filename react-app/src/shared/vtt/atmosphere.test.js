import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ATMOSPHERE_TYPES, DEFAULT_ATMOSPHERE, normalizeAtmosphere,
} from './atmosphere.js';

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
