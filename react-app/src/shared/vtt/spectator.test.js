import test from 'node:test';
import assert from 'node:assert/strict';
import {
  projectPlayerTokens, shouldApplyPresenterFrame, spectatorRoute, spectatorUrl,
} from './spectator.js';

test('spectator routes require a safe camera source and follow the campaign session', () => {
  assert.deepEqual(spectatorRoute('?scene=s1'), { requested: false, source: null });
  assert.deepEqual(spectatorRoute('?spectator=../bad'), { requested: true, source: null });
  assert.equal(spectatorRoute('?spectator=camera-1234').source, 'camera-1234');
  assert.equal(
    spectatorUrl('https://example.test/vtt?scene=old', 'campaign-2', 'camera-1234'),
    'https://example.test/vtt?campaign=campaign-2&spectator=camera-1234',
  );
});

test('projector tokens reproduce the player boundary even for a GM session', () => {
  const projected = projectPlayerTokens([
    { id: 'party', layer: 'tokens', x: 1, y: 1, secretLabel: 'Secret Aria', label: 'Aria' },
    { id: 'ambush', layer: 'tokens', x: 12, y: 1, secretLabel: 'Ambusher' },
    { id: 'gm-note', layer: 'gm', x: 1, y: 1 },
    { id: 'hidden-map-prop', layer: 'map', hiddenFromPlayers: true, x: 1, y: 1 },
  ], { x: 0, y: 0, w: 10, h: 10 });

  assert.deepEqual(projected.map((token) => token.id), ['party']);
  assert.equal(Object.hasOwn(projected[0], 'secretLabel'), false);
});

test('freezing captures one last presenter frame and then ignores later frames', () => {
  assert.equal(shouldApplyPresenterFrame(true, false), true);
  assert.equal(shouldApplyPresenterFrame(false, false), false);
  assert.equal(shouldApplyPresenterFrame(false, true), true);
});
