// Dice thrown onto the map as if it were the table.
//
// The map is seen from above, so the table is the screen: x and y are the board,
// z is height over it. Dice come down, bounce, skid, knock into each other and
// into the edges of the tray, and stop — and the face left looking at you is
// what was rolled. Nothing here is decorating a number decided elsewhere: the
// throw IS the roll, which is the whole point of throwing it.
//
// Seeded rather than random, so the roller and everyone watching get the same
// throw and therefore the same result, and computed up front rather than
// stepped live, so a slow frame cannot change where a die lands.
//
// Orientation is a quaternion, not three angles. Reading a result means asking
// which face points at the camera once the die stops. The orientation is never
// replaced afterwards just to make that face or its label look straighter.

import { seededRandom } from '../character/dice3d.js';
import { dieGeometry } from '../character/polyhedra.js';

export const THROWN_DIE_SIZE = 76;

// The tray is a fixed size in pixels, not the size of the view. Everyone
// watching has a different window, and a throw whose walls moved with the
// window would come to rest on a different face for each of them.
export const TRAY = { width: 460, height: 300 };

const FPS = 60;
const DT = 1 / FPS;
const MAX_FRAMES = 300;

const GRAVITY = 2600;      // px/s², tuned to look like a die and not a feather
const RESTITUTION = 0.46;  // how much of a bounce survives the table
const SKID = 0.82;         // how much sideways speed survives hitting it
const ROLL_DRAG = 0.965;   // per frame, once it is down and sliding
const AIR_DRAG = 0.995;
const SPIN_DRAG = 0.985;
const BOUNCE_FLOOR = 46;   // below this the die has stopped bouncing
// Half a pixel a frame is a die that has stopped. Below this it creeps for
// most of a second without anything visibly happening, which reads as a wait
// before the result rather than as part of the throw.
const REST_SPEED = 28;
// Below this, and touching the table, a die is no longer bouncing around: it is
// coming down onto one of its faces. It starts tipping onto that face while it
// is still sliding, the way a real one does, instead of stopping dead and then
// turning itself over.
const SETTLE_SPEED = 360;
const SETTLE_RATE = 0.12;
// Close enough to lie naturally on the table, but deliberately not an exact
// target pose. The simulation ends on the frame it reaches this tolerance.
const REST_ALIGNMENT = 0.9995;

export function simulateThrow(dice, seed, options = {}) {
  const size = options.size || 42;
  const radius = size / 2;
  const half = { x: (options.tray || TRAY).width / 2, y: (options.tray || TRAY).height / 2 };
  const bounds = { minX: -half.x, maxX: half.x, minY: -half.y, maxY: half.y };
  const next = seededRandom(`${seed}:physics`);

  const bodies = (dice || []).map((die) => ({
    faces: dieGeometry(die?.faces).faces,
    x: (next() - 0.5) * 80,
    y: (next() - 0.5) * 60,
    // Well above the table, so they read as falling onto it rather than
    // appearing on it.
    z: 240 + next() * 150,
    vx: (next() - 0.5) * 520,
    vy: (next() - 0.5) * 520,
    vz: -60 - next() * 90,
    q: randomQuaternion(next),
    wx: (next() - 0.5) * 26,
    wy: (next() - 0.5) * 26,
    wz: (next() - 0.5) * 18,
    resting: false,
    target: null,
    landed: null,
  }));

  if (!bodies.length) return { frames: [], results: [], frameMs: DT * 1000, durationMs: 0 };

  const frames = [];
  for (let frame = 0; frame < MAX_FRAMES; frame += 1) {
    for (const body of bodies) step(body, radius, bounds);
    collide(bodies, radius);
    frames.push(bodies.map(snapshot));
    if (bodies.every(settled)) break;
  }

  // A pathological pile-up can run into the safety limit. Put it on the table
  // without changing its orientation: forcing a final face here is the visible
  // "snap to result" that a physical throw must never have.
  if (!bodies.every(settled)) {
    for (const body of bodies) {
      if (!body.resting) {
        body.vx = 0;
        body.vy = 0;
        body.vz = 0;
        body.z = 0;
        body.resting = true;
        comeToRest(body);
      }
    }
    frames.push(bodies.map(snapshot));
  }

  return {
    frames,
    // Which face each die came to rest showing. This is the roll.
    results: bodies.map((body) => body.landed ?? 0),
    frameMs: DT * 1000,
    durationMs: frames.length * DT * 1000,
  };
}

function step(body, radius, bounds) {
  if (body.resting) return;

  body.vz -= GRAVITY * DT;
  body.x += body.vx * DT;
  body.y += body.vy * DT;
  body.z += body.vz * DT;
  body.q = spin(body.q, body.wx, body.wy, body.wz, DT);

  const airborne = body.z > 0.5;
  const drag = airborne ? AIR_DRAG : ROLL_DRAG;
  body.vx *= drag;
  body.vy *= drag;
  const spinDrag = airborne ? SPIN_DRAG : 0.9;
  body.wx *= spinDrag;
  body.wy *= spinDrag;
  body.wz *= spinDrag;

  if (body.z <= 0) {
    body.z = 0;
    if (-body.vz > BOUNCE_FLOOR) {
      body.vz = -body.vz * RESTITUTION;
      body.vx *= SKID;
      body.vy *= SKID;
      body.wx *= 0.7;
      body.wy *= 0.7;
    } else {
      body.vz = 0;
    }
  }

  bounceOffWalls(body, radius, bounds);

  const speed = Math.hypot(body.vx, body.vy);
  if (body.z > 0 || body.vz !== 0) return;

  if (speed < SETTLE_SPEED) {
    // Down and slowing: bed onto the nearest face, harder the slower it goes,
    // so that by the time it stops it is already lying on one. This remains
    // part of the physical motion: there is no corrective animation after the
    // die has been declared at rest. A knock can still turn it over.
    comeToRest(body);
    body.q = slerp(body.q, body.target, SETTLE_RATE * (1 - speed / SETTLE_SPEED));
    body.wx *= 0.6;
    body.wy *= 0.6;
    body.wz *= 0.6;
    if (speed < REST_SPEED && dotQuaternion(body.q, body.target) > REST_ALIGNMENT) {
      body.vx = 0;
      body.vy = 0;
      body.resting = true;
    } else {
      body.resting = false;
    }
  }
}

// Whichever face is nearest to looking at the camera is the one the die is
// coming down on. `target` is used only while it is still sliding, so gravity
// can visibly bed it onto that face. Once it stops, its current quaternion is
// preserved exactly: no last-frame levelling and no rotation to stand the
// printed number upright.
function comeToRest(body) {
  const orientation = body.q;
  let landed = 0;
  let best = -Infinity;
  body.faces.forEach((face, index) => {
    const facing = rotate(orientation, face.normal)[2];
    if (facing > best) {
      best = facing;
      landed = index;
    }
  });

  const face = body.faces[landed];
  const facingCamera = align(rotate(orientation, face.normal), [0, 0, 1]);

  body.landed = landed;
  body.target = normalizeQuaternion(multiply(facingCamera, orientation));
}

// The edge of the tray. A die that skids out of it is a die nobody can read.
function bounceOffWalls(body, radius, bounds) {
  if (body.x - radius < bounds.minX) {
    body.x = bounds.minX + radius;
    body.vx = Math.abs(body.vx) * 0.5;
  } else if (body.x + radius > bounds.maxX) {
    body.x = bounds.maxX - radius;
    body.vx = -Math.abs(body.vx) * 0.5;
  }
  if (body.y - radius < bounds.minY) {
    body.y = bounds.minY + radius;
    body.vy = Math.abs(body.vy) * 0.5;
  } else if (body.y + radius > bounds.maxY) {
    body.y = bounds.maxY - radius;
    body.vy = -Math.abs(body.vy) * 0.5;
  }
}

// Dice knocking into each other, treated as discs — two only count as touching
// when they are at similar heights, so one passing over another in mid-air does
// not shove it.
function collide(bodies, radius) {
  const reach = radius * 2;
  for (let i = 0; i < bodies.length; i += 1) {
    for (let j = i + 1; j < bodies.length; j += 1) {
      const a = bodies[i];
      const b = bodies[j];
      if (Math.abs(a.z - b.z) > radius) continue;

      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const distance = Math.hypot(dx, dy);
      if (distance >= reach || distance < 1e-6) continue;

      const nx = dx / distance;
      const ny = dy / distance;
      const overlap = (reach - distance) / 2;
      a.x -= nx * overlap;
      a.y -= ny * overlap;
      b.x += nx * overlap;
      b.y += ny * overlap;

      // Equal masses: they swap the part of their motion that runs along the
      // line between them.
      const closing = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
      if (closing > 0) continue;
      const impulse = -closing * 0.5 * (1 + RESTITUTION);
      a.vx -= impulse * nx;
      a.vy -= impulse * ny;
      b.vx += impulse * nx;
      b.vy += impulse * ny;

      // A die that is shoved hard enough is rolling again, and what it was
      // going to show no longer counts.
      for (const body of [a, b]) {
        if (Math.hypot(body.vx, body.vy) > REST_SPEED) {
          body.resting = false;
          body.target = null;
          body.landed = null;
          body.wz += impulse * 0.05;
        }
      }
    }
  }
}

function settled(body) {
  return body.resting;
}

function snapshot(body) {
  return {
    x: round(body.x),
    y: round(body.y),
    z: round(body.z),
    // Six places, not five: the resting orientation is checked against the
    // face it landed on, and rounding the last frame coarsely is enough to
    // leave the die measurably off square.
    q: body.q.map((component) => Math.round(component * 1e6) / 1e6),
  };
}

function round(value) {
  return Math.round(value * 100) / 100;
}

// --- quaternions -----------------------------------------------------------
//
// [w, x, y, z], unit length, rotating a column vector as v' = q v q*.

export function multiply(a, b) {
  return [
    a[0] * b[0] - a[1] * b[1] - a[2] * b[2] - a[3] * b[3],
    a[0] * b[1] + a[1] * b[0] + a[2] * b[3] - a[3] * b[2],
    a[0] * b[2] - a[1] * b[3] + a[2] * b[0] + a[3] * b[1],
    a[0] * b[3] + a[1] * b[2] - a[2] * b[1] + a[3] * b[0],
  ];
}

export function rotate(q, v) {
  const [w, x, y, z] = q;
  const [vx, vy, vz] = v;
  // v + 2w(q × v) + 2(q × (q × v)), written out.
  const tx = 2 * (y * vz - z * vy);
  const ty = 2 * (z * vx - x * vz);
  const tz = 2 * (x * vy - y * vx);
  return [
    vx + w * tx + (y * tz - z * ty),
    vy + w * ty + (z * tx - x * tz),
    vz + w * tz + (x * ty - y * tx),
  ];
}

export function fromAxisAngle(axis, angle) {
  const half = angle / 2;
  const s = Math.sin(half);
  return [Math.cos(half), axis[0] * s, axis[1] * s, axis[2] * s];
}

// The short way round from one direction to another.
function align(from, to) {
  const axis = [
    from[1] * to[2] - from[2] * to[1],
    from[2] * to[0] - from[0] * to[2],
    from[0] * to[1] - from[1] * to[0],
  ];
  const sin = Math.hypot(...axis);
  const cos = from[0] * to[0] + from[1] * to[1] + from[2] * to[2];
  if (sin < 1e-9) return cos > 0 ? [1, 0, 0, 0] : [0, 1, 0, 0];
  const angle = Math.atan2(sin, cos);
  return fromAxisAngle(axis.map((component) => component / sin), angle);
}

function spin(q, wx, wy, wz, dt) {
  const derivative = multiply([0, wx, wy, wz], q);
  return normalizeQuaternion([
    q[0] + 0.5 * derivative[0] * dt,
    q[1] + 0.5 * derivative[1] * dt,
    q[2] + 0.5 * derivative[2] * dt,
    q[3] + 0.5 * derivative[3] * dt,
  ]);
}

function slerp(from, to, amount) {
  // Nudging then renormalising: at a quarter of the way per frame the
  // difference from a true slerp is invisible, and it cannot divide by zero as
  // the two ends meet.
  const sign = dotQuaternion(from, to) < 0 ? -1 : 1;
  return normalizeQuaternion(from.map(
    (component, index) => component + (to[index] * sign - component) * amount,
  ));
}

function dotQuaternion(a, b) {
  return Math.abs(a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3]);
}

function normalizeQuaternion(q) {
  const len = Math.hypot(...q) || 1;
  return q.map((component) => component / len);
}

function randomQuaternion(next) {
  // Shoemake: uniform over orientations, so a die does not start out favouring
  // any face.
  const u1 = next();
  const u2 = next() * 2 * Math.PI;
  const u3 = next() * 2 * Math.PI;
  const a = Math.sqrt(1 - u1);
  const b = Math.sqrt(u1);
  return [a * Math.sin(u2), a * Math.cos(u2), b * Math.sin(u3), b * Math.cos(u3)];
}

// The orientation as CSS wants it: sixteen numbers, down the columns.
export function orientationMatrix(q) {
  const [w, x, y, z] = q;
  return [
    1 - 2 * (y * y + z * z), 2 * (x * y + w * z), 2 * (x * z - w * y), 0,
    2 * (x * y - w * z), 1 - 2 * (x * x + z * z), 2 * (y * z + w * x), 0,
    2 * (x * z + w * y), 2 * (y * z - w * x), 1 - 2 * (x * x + y * y), 0,
    0, 0, 0, 1,
  ];
}
