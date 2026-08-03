import test from 'node:test';
import assert from 'node:assert/strict';
import {
  cameraMessage,
  cameraPoseToView,
  normalizeCameraPose,
  normalizeCameraSource,
  presenterStateMessage,
  sessionCameraSource,
  viewToCameraPose,
} from './cameraSync.js';

test('spectator camera messages accept only bounded poses and safe source ids', () => {
  assert.equal(normalizeCameraSource('camera-1234'), 'camera-1234');
  assert.equal(normalizeCameraSource('../camera'), null);
  assert.equal(normalizeCameraSource('tiny'), null);
  assert.deepEqual(normalizeCameraPose({ centerX: 12, centerY: -4, zoom: 99 }), {
    centerX: 12, centerY: -4, zoom: 6,
  });
  assert.equal(normalizeCameraPose({ centerX: 0, centerY: null, zoom: 1 }), null);
  assert.deepEqual(cameraMessage('camera-1234', { centerX: 1, centerY: 2, zoom: 1.5 }), {
    source: 'camera-1234',
    pose: { centerX: 1, centerY: 2, zoom: 1.5 },
  });
});

test('the presenter source survives a refresh in the same browser tab', () => {
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) || null,
    setItem: (key, value) => values.set(key, value),
  };
  const first = sessionCameraSource(storage);
  const refreshed = sessionCameraSource(storage);
  assert.equal(refreshed, first);
  assert.equal(normalizeCameraSource(refreshed), refreshed);
});

test('presenter state carries follow mode, picture, and an optional camera snapshot', () => {
  assert.deepEqual(presenterStateMessage('camera-1234', {
    following: false,
    shownImage: 'background',
    pose: { centerX: 1, centerY: 2, zoom: 1.5 },
  }), {
    source: 'camera-1234',
    following: false,
    shownImage: 'background',
    pose: { centerX: 1, centerY: 2, zoom: 1.5 },
  });
  assert.deepEqual(presenterStateMessage('camera-1234', {
    following: true,
    shownImage: 'map',
    pose: null,
  }), {
    source: 'camera-1234', following: true, shownImage: 'map', pose: null,
  });
  assert.equal(presenterStateMessage('camera-1234', {
    following: 'yes', shownImage: 'map', pose: null,
  }), null);
});

test('camera poses preserve the same world centre across different screens', () => {
  const pose = viewToCameraPose(
    { x: 100, y: 50, zoom: 2 },
    { width: 1000, height: 700 },
  );
  assert.deepEqual(pose, { centerX: 200, centerY: 150, zoom: 2 });
  assert.deepEqual(
    cameraPoseToView(pose, { width: 1920, height: 1080 }),
    { x: 560, y: 240, zoom: 2 },
  );
  assert.equal(cameraPoseToView(pose, { width: 0, height: 1080 }), null);
});
