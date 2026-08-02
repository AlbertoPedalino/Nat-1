import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canEraseDrawing,
  drawingAtPoint,
  isDrawable,
  lastDrawing,
  normalizePoints,
  simplifyStroke,
  toDrawing,
} from './drawing.js';

test('points are trimmed and garbage is dropped', () => {
  assert.deepEqual(normalizePoints([{ x: 1.23456, y: 2 }]), [{ x: 1.235, y: 2 }]);
  assert.deepEqual(normalizePoints([{ x: 'a', y: 1 }, null, { x: 1, y: 1 }]), [{ x: 1, y: 1 }]);
  assert.deepEqual(normalizePoints(null), []);
});

// A straight line sampled at pointer rate is dozens of points that say nothing:
// the ones in the middle are exactly where the line already goes.
test('a straight stroke collapses to its endpoints', () => {
  const straight = Array.from({ length: 40 }, (_, index) => ({ x: index * 0.1, y: 0 }));
  const simplified = simplifyStroke(straight);
  assert.deepEqual(simplified, [{ x: 0, y: 0 }, { x: 3.9, y: 0 }]);
});

test('a corner survives simplification', () => {
  const corner = [
    { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 },
    { x: 2, y: 1 }, { x: 2, y: 2 },
  ];
  const simplified = simplifyStroke(corner);
  assert.deepEqual(simplified, [{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 2, y: 2 }]);
});

test('simplification keeps the ends and never returns fewer than two points', () => {
  const wiggle = Array.from({ length: 200 }, (_, index) => ({
    x: index * 0.05,
    y: Math.sin(index / 3) * 0.5,
  }));
  const simplified = simplifyStroke(wiggle);
  assert.ok(simplified.length < wiggle.length, 'it should actually simplify');
  assert.ok(simplified.length >= 2);
  // Compared against the normalized form: simplification trims float noise on
  // the way through, endpoints included.
  const normalized = normalizePoints(wiggle);
  assert.deepEqual(simplified[0], normalized[0]);
  assert.deepEqual(simplified[simplified.length - 1], normalized[normalized.length - 1]);

  assert.deepEqual(simplifyStroke([{ x: 0, y: 0 }]), [{ x: 0, y: 0 }]);
  assert.deepEqual(simplifyStroke([]), []);
});

// A tighter tolerance has to keep at least as much as a looser one.
test('tolerance controls how much is kept', () => {
  const wiggle = Array.from({ length: 100 }, (_, index) => ({ x: index * 0.1, y: (index % 2) * 0.2 }));
  assert.ok(simplifyStroke(wiggle, 0.01).length >= simplifyStroke(wiggle, 0.5).length);
});

test('a dot is drawable, an empty stroke is not', () => {
  assert.equal(isDrawable([{ x: 1, y: 1 }]), true);
  assert.equal(isDrawable([]), false);
  assert.equal(isDrawable([{ x: NaN, y: 1 }]), false);
});

test('a row becomes a drawing with a usable width and points', () => {
  const drawing = toDrawing({
    id: 'd1',
    scene_id: 's1',
    points: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
    width: 0,
    created_at: '2026-08-02T10:00:00.000Z',
  });
  assert.equal(drawing.width, 0.5, 'a zero width would draw nothing');
  assert.equal(drawing.layer, 'tokens');
  assert.equal(drawing.points.length, 2);
  assert.equal(toDrawing(null), null);
});

// Measured to the segments, not to the stored points: after simplification a
// long straight line has only two of them, and an eraser that only worked at the
// ends would look broken.
test('the eraser finds a stroke anywhere along it', () => {
  const line = toDrawing({ id: 'd1', points: [{ x: 0, y: 0 }, { x: 10, y: 0 }], width: 3 });
  assert.equal(drawingAtPoint([line], { x: 5, y: 0.1 })?.id, 'd1');
  assert.equal(drawingAtPoint([line], { x: 5, y: 4 }), null);
  assert.equal(drawingAtPoint([line], null), null);
  assert.equal(drawingAtPoint([], { x: 0, y: 0 }), null);

  const dot = toDrawing({ id: 'd2', points: [{ x: 3, y: 3 }], width: 3 });
  assert.equal(drawingAtPoint([dot], { x: 3.2, y: 3 })?.id, 'd2');
});

// Mirrors the delete policy: without this the undo button would become a way to
// wipe the GM's annotations.
test('a player rubs out only their own strokes', () => {
  const mine = toDrawing({ id: 'd1', points: [{ x: 0, y: 0 }], created_by: 'me' });
  const theirs = toDrawing({ id: 'd2', points: [{ x: 0, y: 0 }], created_by: 'gm' });
  const secret = toDrawing({ id: 'd3', layer: 'gm', points: [{ x: 0, y: 0 }], created_by: 'me' });

  assert.equal(canEraseDrawing(mine, { userId: 'me' }), true);
  assert.equal(canEraseDrawing(theirs, { userId: 'me' }), false);
  assert.equal(canEraseDrawing(secret, { userId: 'me' }), false);
  assert.equal(canEraseDrawing(theirs, { isGm: true }), true);
  assert.equal(canEraseDrawing(null, { isGm: true }), false);
});

test('the newest stroke wins under the eraser and under undo', () => {
  const older = toDrawing({ id: 'old', points: [{ x: 0, y: 0 }, { x: 5, y: 0 }], created_at: '2026-08-02T10:00:00Z' });
  const newer = toDrawing({ id: 'new', points: [{ x: 0, y: 0 }, { x: 5, y: 0 }], created_at: '2026-08-02T11:00:00Z' });
  assert.equal(drawingAtPoint([older, newer], { x: 2, y: 0 })?.id, 'new');
  assert.equal(lastDrawing([older, newer])?.id, 'new');
  assert.equal(lastDrawing([]), null);
});
