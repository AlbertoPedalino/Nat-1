import test from 'node:test';
import assert from 'node:assert/strict';
import { dieGeometry, dieShapeFor } from './polyhedra.js';

const EXPECTED_SIDES = { 4: 3, 6: 4, 8: 3, 10: 3, 12: 5, 20: 3 };

test('every die is the solid it should be', () => {
  for (const sides of [4, 6, 8, 10, 12, 20]) {
    const geometry = dieGeometry(sides);
    assert.equal(geometry.faces.length, sides, `a d${sides} needs ${sides} faces`);
  }
});

test('each face is the right polygon', () => {
  for (const [sides, corners] of Object.entries(EXPECTED_SIDES)) {
    const geometry = dieGeometry(Number(sides));
    for (const face of geometry.faces) {
      const points = face.clipPath.slice('polygon('.length, -1).split(', ');
      assert.equal(points.length, corners, `a d${sides} face should have ${corners} corners`);
    }
  }
});

// If the faces sat at different depths the solid would not close: it would be a
// scattering of plates rather than a die.
test('every face of a Platonic die sits the same distance from the centre', () => {
  for (const sides of [4, 6, 8, 12, 20]) {
    const geometry = dieGeometry(sides, 20);
    const depths = geometry.faces.map((face) => {
      const parts = face.transform.slice('matrix3d('.length, -1).split(',').map(Number);
      // Columns 12..14 are the translation: how far out the face was pushed.
      return Math.hypot(parts[12], parts[13], parts[14]);
    });
    const first = depths[0];
    for (const depth of depths) {
      assert.ok(Math.abs(depth - first) < 0.01, `d${sides}: ${depth} vs ${first}`);
    }
    assert.ok(first > 0 && first < 20, 'the inradius is inside the circumradius');
  }
});

// Not merely the nearest face: square on. A d20 rests on whichever of its
// twenty faces happens to point most nearly at you, and "most nearly" is
// several degrees off — the result would read at an angle, like a die
// photographed from the side.
test('the face that lands looks straight out of the screen', () => {
  for (const sides of [4, 6, 8, 10, 12, 20]) {
    const geometry = dieGeometry(sides);
    const landing = geometry.faces[geometry.landing];
    assert.ok(landing.towardsViewer > 1 - 1e-9, `d${sides} lands at an angle`);

    // Identity but for the push out to the face: the number on it is upright
    // and unrotated, not lying on its side.
    const matrix = landing.transform.slice('matrix3d('.length, -1).split(',').map(Number);
    assert.deepEqual(matrix.slice(0, 3), [1, 0, 0]);
    assert.deepEqual(matrix.slice(4, 7), [0, 1, 0]);
    assert.deepEqual(matrix.slice(8, 11), [0, 0, 1]);
    // Centred over the die — except on the d10, whose faces are isosceles, so
    // their centres sit a little off the axis by construction.
    const offset = Math.hypot(matrix[12], matrix[13]);
    assert.ok(offset < (sides === 10 ? 1 : 1e-9), `d${sides} lands ${offset} off centre`);
  }
});

test('a corner of the landing face points up', () => {
  const [, y] = dieGeometry(20).faces[dieGeometry(20).landing]
    .clipPath.slice('polygon('.length, -1)
    .split(', ')[0]
    .split(' ')
    .map(parseFloat);
  assert.ok(y < 40, `the first corner sits at ${y}% down, not near the top`);
});

test('a die grows with its radius and nothing else', () => {
  const small = dieGeometry(20, 10);
  const large = dieGeometry(20, 30);
  assert.equal(small.size, 20);
  assert.equal(large.size, 60);
  assert.equal(small.faces[0].clipPath, large.faces[0].clipPath, 'the shape is the same at any size');
});

// Nothing may crash or come back shapeless.
test('a die with no solid of its own still gets one', () => {
  assert.equal(dieShapeFor(30), 100, 'the next size up that exists');
  assert.equal(dieShapeFor(7), 8);
});

// A hundred-faced die is built by spreading corners over a sphere, and a hull
// whose corners are a shade too evenly placed merges two faces into one and
// leaves the die with ninety-nine — which would be a d99.
test('a d100 really has a hundred faces, numbered one to a hundred', () => {
  const geometry = dieGeometry(100, 24);
  assert.equal(dieShapeFor(100), 100);
  assert.equal(geometry.faces.length, 100);
  for (const face of geometry.faces) {
    assert.equal(face.clipPath.slice('polygon('.length, -1).split(', ').length, 3);
  }
});

// There is no polyhedron with two faces, so a d2 is a coin: two discs and a
// band round the edge. The band must not be a face — a coin that could land on
// its edge is a good story and a bad dice roller.
test('a two-sided die is a coin with two faces and an edge', () => {
  const coin = dieGeometry(2, 24);
  assert.equal(dieShapeFor(2), 2);
  assert.equal(coin.faces.length, 2);
  assert.ok(coin.rim.length > 8, 'the edge is drawn');
  // Rounded rather than clipped: a clip-path on a face that ends up exactly
  // face-on to the viewer is what squared the coin off.
  for (const face of coin.faces) {
    assert.equal(face.borderRadius, '50%');
    assert.equal(face.clipPath, undefined);
  }
  assert.deepEqual(coin.faces.map((face) => face.normal), [[0, 0, 1], [0, 0, -1]]);
  assert.equal(coin.faces[coin.landing].towardsViewer, 1);
});

// Every other die reports no edge panels, so the renderer can treat them alike.
test('a polyhedron has no edge band', () => {
  for (const sides of [4, 6, 8, 10, 12, 20]) {
    assert.equal(dieGeometry(sides).rim, undefined);
  }
});
