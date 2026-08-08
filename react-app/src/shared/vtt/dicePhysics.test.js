import test from 'node:test';
import assert from 'node:assert/strict';
import { dieGeometry } from '../character/polyhedra.js';
import { orientationMatrix, rotate, simulateThrow } from './dicePhysics.js';

const dice = (count, faces = 20) => Array.from({ length: count }, () => ({ faces }));
const SIZE = 42;
const TRAY = { width: 460, height: 300 };
const bounds = { minX: -TRAY.width / 2, maxX: TRAY.width / 2, minY: -TRAY.height / 2, maxY: TRAY.height / 2 };

function lastFrame(result) {
  return result.frames[result.frames.length - 1];
}

function orientationChange(a, b) {
  const dot = Math.abs(a.reduce((sum, value, index) => sum + value * b[index], 0));
  return (2 * Math.acos(Math.min(1, dot)) * 180) / Math.PI;
}

test('the dice come down and stop', () => {
  const result = simulateThrow(dice(6), 'roll-1', { size: SIZE });
  assert.ok(result.frames.length > 30, 'a throw that lasts no time is not a throw');
  assert.ok(result.frames.length < 300, 'they stopped on their own, not at the time limit');
  for (const die of lastFrame(result)) {
    assert.equal(die.z, 0, 'every die is on the table');
  }
});

// The whole point: the die is not showing a number that was decided elsewhere.
// Whatever face the throw left looking most towards the camera is the result.
test('the result is the face the throw left facing the camera', () => {
  const result = simulateThrow(dice(8), 'roll-2', { size: SIZE });
  const geometry = dieGeometry(20);
  const settled = lastFrame(result);

  result.results.forEach((landed, index) => {
    const orientation = settled[index].q;
    const facing = geometry.faces.map((face) => rotate(orientation, face.normal)[2]);
    const highest = facing.indexOf(Math.max(...facing));
    assert.equal(landed, highest, 'the reported face is not the one on top');
  });
});

test('the final pose is not straightened to make the result upright', () => {
  const result = simulateThrow(dice(12), 'roll-3', { size: SIZE });
  const geometry = dieGeometry(20);
  const naturalTurns = lastFrame(result).filter((die, index) => {
    const up = rotate(die.q, geometry.faces[result.results[index]].up);
    return Math.abs(up[1]) > 0.05;
  });
  assert.ok(naturalTurns.length > 0, 'every result was artificially turned upright');
});

// Twenty faces, and over many throws they should not all be the same one.
test('the throw is not rigged to one face', () => {
  const seen = new Set();
  for (let index = 0; index < 25; index += 1) {
    seen.add(simulateThrow(dice(1), `roll-${index}`, { size: SIZE }).results[0]);
  }
  assert.ok(seen.size > 6, `only ${seen.size} different faces came up in 25 throws`);
});

test('every die type comes to rest on one of its own faces', () => {
  for (const faces of [4, 6, 8, 10, 12, 20]) {
    const result = simulateThrow(dice(3, faces), `roll-d${faces}`, { size: SIZE });
    for (const landed of result.results) {
      assert.ok(landed >= 0 && landed < dieGeometry(faces).faces.length, `d${faces} landed on face ${landed}`);
    }
  }
});

test('the dice knock each other apart instead of stacking up', () => {
  const settled = lastFrame(simulateThrow(dice(9), 'roll-4', { size: SIZE }));
  for (let i = 0; i < settled.length; i += 1) {
    for (let j = i + 1; j < settled.length; j += 1) {
      const gap = Math.hypot(settled[i].x - settled[j].x, settled[i].y - settled[j].y);
      assert.ok(gap > SIZE - 1, `two dice ended ${gap.toFixed(1)}px apart`);
    }
  }
});

test('nothing skids out of the tray', () => {
  for (const frame of simulateThrow(dice(10), 'roll-5', { size: SIZE }).frames) {
    for (const die of frame) {
      assert.ok(die.x - SIZE / 2 >= bounds.minX - 1, `${die.x} is off the left edge`);
      assert.ok(die.x + SIZE / 2 <= bounds.maxX + 1, `${die.x} is off the right edge`);
      assert.ok(die.y - SIZE / 2 >= bounds.minY - 1);
      assert.ok(die.y + SIZE / 2 <= bounds.maxY + 1);
    }
  }
});

// They fall, so there has to be a stretch where they are still in the air, and
// a bounce after the first contact.
test('a die falls and bounces rather than dropping into place', () => {
  const { frames } = simulateThrow(dice(1), 'roll-6', { size: SIZE });
  const heights = frames.map((frame) => frame[0].z);
  assert.ok(heights[0] > 200, 'it starts well above the table');

  const firstLanding = heights.findIndex((z) => z === 0);
  assert.ok(firstLanding > 0);
  assert.ok(
    heights.slice(firstLanding).some((z) => z > 4),
    'it came back up off the table at least once',
  );
});

// Everybody watching has a different window. If the walls moved with the
// window, the same throw would come to rest on a different face for each of
// them — and they would be reading different results off the same roll.
test('one throw is one result, whoever is watching', () => {
  const here = simulateThrow(dice(5), 'roll-7', { size: SIZE });
  const there = simulateThrow(dice(5), 'roll-7', { size: SIZE });
  assert.deepEqual(here.results, there.results);
  assert.deepEqual(lastFrame(here), lastFrame(there));
});

// Dice jostling in a corner can keep waking each other up. Whatever happens,
// the throw has to end with every die down and readable — one left hanging
// stays hanging for the rest of the roll.
test('no throw ever ends with a die in the air or reports a different face', () => {
  const geometry = dieGeometry(20);
  for (let index = 0; index < 60; index += 1) {
    const result = simulateThrow(dice(6), `settle-${index}`, { size: SIZE });
    lastFrame(result).forEach((die, seat) => {
      assert.equal(die.z, 0, `throw ${index}: a die stopped ${die.z}px up`);
      const facing = geometry.faces.map((face) => rotate(die.q, face.normal)[2]);
      assert.equal(
        result.results[seat],
        facing.indexOf(Math.max(...facing)),
        `throw ${index}: the reported face is not the visible one`,
      );
    });
  }
});

// A die used to stop dead and only then turn itself over to show a face, which
// read as a fixed wait tacked onto the end of every roll. It should bed onto a
// face as it slides to a halt, the way a real one does. A die that stops
// abruptly — off a wall, or off another die — has no sliding left to do it in,
// so this is about the throw in general rather than every last one.
test('a die keeps its natural final angle instead of snapping perfectly square', () => {
  const geometry = dieGeometry(20);
  let naturallyAngled = 0;
  const throws = 60;

  for (let index = 0; index < throws; index += 1) {
    const { frames, results } = simulateThrow(dice(1), `bed-${index}`, { size: SIZE });

    const facing = rotate(lastFrame({ frames })[0].q, geometry.faces[results[0]].normal)[2];
    if (facing < 0.99999) naturallyAngled += 1;
  }

  assert.ok(naturallyAngled > throws / 2, 'the simulation still forces a perfect final pose');
});

test('a coin falls flat progressively without a final correction', () => {
  const geometry = dieGeometry(2);
  let naturallyAngled = 0;

  for (let index = 0; index < 30; index += 1) {
    const result = simulateThrow(dice(1, 2), `coin-settle-${index}`, { size: 76 });
    const final = lastFrame(result)[0];
    const before = result.frames[result.frames.length - 2][0];
    const facing = rotate(final.q, geometry.faces[result.results[0]].normal)[2];

    assert.ok(facing > 0.995, `coin ${index} stopped on its edge (${facing})`);
    assert.ok(
      orientationChange(before.q, final.q) < 2,
      `coin ${index} snapped ${orientationChange(before.q, final.q).toFixed(2)}° on its last frame`,
    );
    if (facing < 0.99999) naturallyAngled += 1;
  }

  assert.ok(naturallyAngled > 20, 'coins are still being replaced with a perfect result pose');
});

test('a throw lasts about as long as a throw', () => {
  for (const count of [1, 6, 12]) {
    const { durationMs } = simulateThrow(dice(count), `pace-${count}`, { size: SIZE });
    assert.ok(durationMs > 800, `${count} dice landed in ${durationMs}ms — too fast to watch`);
    assert.ok(durationMs < 2600, `${count} dice took ${durationMs}ms to land`);
  }
});

test('two throws are not the same throw', () => {
  assert.notDeepEqual(
    lastFrame(simulateThrow(dice(5), 'roll-8', { size: SIZE })),
    lastFrame(simulateThrow(dice(5), 'roll-9', { size: SIZE })),
  );
});

test('a large roll simulates every die', () => {
  const result = simulateThrow(dice(40), 'roll-big', { size: SIZE });
  assert.equal(lastFrame(result).length, 40);
  assert.equal(result.results.length, 40);
});

test('a roll with no dice simulates nothing', () => {
  assert.deepEqual(simulateThrow([], 'roll-10').frames, []);
  assert.deepEqual(simulateThrow(null, 'roll-10').results, []);
});

test('an orientation converts to a transform CSS can use', () => {
  const matrix = orientationMatrix([1, 0, 0, 0]);
  assert.equal(matrix.length, 16);
  assert.deepEqual(matrix.slice(0, 4), [1, 0, 0, 0]);
  assert.deepEqual(matrix.slice(12), [0, 0, 0, 1]);
});
