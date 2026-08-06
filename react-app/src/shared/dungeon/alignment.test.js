import test from 'node:test';
import assert from 'node:assert/strict';
import {
  alignmentError,
  applyAlignment,
  invertAlignment,
  isPlausibleAlignment,
  solveAlignment,
} from './alignment.js';

const close = (actual, expected, tolerance = 1e-9) => {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `expected ${actual} to be within ${tolerance} of ${expected}`,
  );
};

const closePoint = (actual, expected, tolerance = 1e-9) => {
  close(actual.x, expected.x, tolerance);
  close(actual.y, expected.y, tolerance);
};

test('two points fix the scale, the angle and the shift', () => {
  // The plan doubled, turned a quarter turn, and moved.
  const solved = solveAlignment(
    [{ x: 0, y: 0 }, { x: 1, y: 0 }],
    [{ x: 100, y: 50 }, { x: 100, y: 52 }],
  );

  close(solved.scale, 2);
  close(solved.rotation, Math.PI / 2);
  closePoint(applyAlignment(solved, { x: 0, y: 0 }), { x: 100, y: 50 });
  closePoint(applyAlignment(solved, { x: 1, y: 0 }), { x: 100, y: 52 });
  // A third point follows for free, which is the whole point of the exercise.
  closePoint(applyAlignment(solved, { x: 0, y: 1 }), { x: 98, y: 50 });
});

// The generator turns the map by whatever angle suits the page — measured at
// about sixty degrees on a real export — so the angle cannot be assumed to be a
// quarter turn.
test('an awkward angle is solved as readily as a quarter turn', () => {
  const angle = (-59.7 * Math.PI) / 180;
  const scale = 103.4;
  const place = ({ x, y }) => ({
    x: scale * (Math.cos(angle) * x - Math.sin(angle) * y) + 812,
    y: scale * (Math.sin(angle) * x + Math.cos(angle) * y) - 245,
  });
  const rooms = [{ x: -1, y: 1 }, { x: 7, y: 22 }, { x: -20, y: 36 }];

  const solved = solveAlignment([rooms[0], rooms[1]], [place(rooms[0]), place(rooms[1])]);

  close(solved.scale, scale, 1e-9);
  close(solved.rotation, angle, 1e-12);
  // The room nobody clicked lands where the picture has it.
  closePoint(applyAlignment(solved, rooms[2]), place(rooms[2]), 1e-9);
});

test('a point on the map comes back as the cell it fell in', () => {
  const solved = solveAlignment(
    [{ x: 2, y: 3 }, { x: 5, y: 3 }],
    [{ x: 400, y: 100 }, { x: 400, y: 400 }],
  );

  closePoint(invertAlignment(solved, { x: 400, y: 100 }), { x: 2, y: 3 });
  closePoint(invertAlignment(solved, applyAlignment(solved, { x: -7, y: 12 })), { x: -7, y: 12 });
});

// Any two points solve perfectly, so the pair itself can never prove the clicks
// were right. A third room is the only check there is.
test('a third room is what catches a click on the wrong one', () => {
  const truth = solveAlignment(
    [{ x: 0, y: 0 }, { x: 10, y: 0 }],
    [{ x: 0, y: 0 }, { x: 100, y: 0 }],
  );
  assert.equal(alignmentError(truth, { x: 5, y: 5 }, { x: 50, y: 50 }), 0);

  // The same first click, the second one room too far: still a perfect solve,
  // and a third room now lands nowhere near where the picture has it.
  const wrong = solveAlignment(
    [{ x: 0, y: 0 }, { x: 10, y: 0 }],
    [{ x: 0, y: 0 }, { x: 120, y: 0 }],
  );
  // At that scale the third room lands at (60, 60) instead of (50, 50).
  close(alignmentError(wrong, { x: 5, y: 5 }, { x: 50, y: 50 }), Math.hypot(10, 10), 1e-9);
});

test('two clicks that say nothing are refused rather than answered', () => {
  // The same room clicked twice fixes neither angle nor scale.
  assert.equal(solveAlignment([{ x: 1, y: 1 }, { x: 1, y: 1 }], [{ x: 0, y: 0 }, { x: 9, y: 9 }]), null);
  assert.equal(solveAlignment([{ x: 0, y: 0 }, { x: 4, y: 0 }], [{ x: 7, y: 7 }, { x: 7, y: 7 }]), null);
  assert.equal(solveAlignment([{ x: 0, y: 0 }], [{ x: 0, y: 0 }]), null);
  assert.equal(solveAlignment(null, null), null);
});

test('an answer that could not be a picture of the same dungeon is rejected', () => {
  const sane = solveAlignment([{ x: 0, y: 0 }, { x: 1, y: 0 }], [{ x: 0, y: 0 }, { x: 90, y: 0 }]);
  assert.equal(isPlausibleAlignment(sane), true);
  assert.equal(isPlausibleAlignment(null), false);
  assert.equal(isPlausibleAlignment({ ...sane, scale: 0 }), false);
  assert.equal(isPlausibleAlignment({ ...sane, tx: NaN }), false);
});
