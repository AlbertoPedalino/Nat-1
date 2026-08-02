// The actual shape of a die.
//
// A d20 drawn as a cube reads as "a number in a box"; a real icosahedron
// tumbling across the map reads as a die. So each die type is built as its own
// solid — tetrahedron, cube, octahedron, pentagonal bipyramid, dodecahedron,
// icosahedron — and every face is handed to CSS as a `matrix3d` that places it
// in space plus a `clip-path` that cuts it to the right polygon.
//
// `matrix3d` rather than a stack of rotate()s: the rotation that takes a face
// from the screen plane to its place on the solid is exactly the matrix whose
// columns are the face's own basis, and writing it directly avoids guessing at
// CSS's rotation order and its downward Y axis. The Y axis does mirror the
// whole solid, which for a die is invisible.
//
// Pure geometry, no React: the shapes are the same everywhere a die is shown.

const PHI = (1 + Math.sqrt(5)) / 2;
const EPS = 1e-6;

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const length = (a) => Math.sqrt(dot(a, a));

function normalize(a) {
  const len = length(a) || 1;
  return [a[0] / len, a[1] / len, a[2] / len];
}

function centroidOf(points) {
  const sum = points.reduce((acc, p) => [acc[0] + p[0], acc[1] + p[1], acc[2] + p[2]], [0, 0, 0]);
  return sum.map((value) => value / points.length);
}

// Cyclic permutations, which is how every one of these vertex sets is written.
function cycle(a, b, c) {
  return [[a, b, c], [b, c, a], [c, a, b]];
}

function signs(pattern) {
  const out = [];
  for (const sx of [1, -1]) {
    for (const sy of [1, -1]) {
      for (const sz of [1, -1]) {
        out.push([pattern[0] * sx, pattern[1] * sy, pattern[2] * sz]);
      }
    }
  }
  return out;
}

// Distinct points only: the sign expansion above produces duplicates whenever a
// coordinate is zero.
function dedupe(points) {
  const out = [];
  for (const point of points) {
    if (!out.some((other) => length(sub(point, other)) < EPS)) out.push(point);
  }
  return out;
}

const ICOSA_VERTICES = dedupe(
  [[0, 1, PHI], [0, 1, -PHI], [0, -1, PHI], [0, -1, -PHI]]
    .flatMap(([a, b, c]) => cycle(a, b, c)),
);

const DODECA_VERTICES = dedupe([
  ...signs([1, 1, 1]),
  ...[[0, 1 / PHI, PHI], [0, 1 / PHI, -PHI], [0, -1 / PHI, PHI], [0, -1 / PHI, -PHI]]
    .flatMap(([a, b, c]) => cycle(a, b, c)),
]);

const CUBE_VERTICES = signs([1, 1, 1]);
const OCTA_VERTICES = dedupe(signs([1, 0, 0]).concat(signs([0, 1, 0]), signs([0, 0, 1])));
const TETRA_VERTICES = [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]];

// A d10 is really a pentagonal trapezohedron, but a pentagonal bipyramid has
// the same ten faces, the same silhouette in motion, and a tenth of the maths.
function bipyramid(sides = 5, height = 1.15) {
  const vertices = [];
  for (let i = 0; i < sides; i += 1) {
    const angle = (2 * Math.PI * i) / sides;
    vertices.push([Math.cos(angle), Math.sin(angle), 0]);
  }
  vertices.push([0, 0, height], [0, 0, -height]);
  return vertices;
}

// A d100 is a real hundred-sided die, not a d10 marked in tens.
//
// There is no regular solid with a hundred faces, so its corners are spread
// evenly over a sphere by the golden angle and the hull is taken. A hull whose
// faces are all triangles has two faces for every corner less four, so fifty-two
// corners give exactly the hundred wanted — which the tests check, because a
// near-coplanar pair of corners would merge into one face and quietly leave the
// die with ninety-nine.
function sphereVertices(count) {
  const golden = Math.PI * (3 - Math.sqrt(5));
  const points = [];
  for (let index = 0; index < count; index += 1) {
    const y = 1 - (2 * index + 1) / count;
    const ring = Math.sqrt(Math.max(0, 1 - y * y));
    const angle = golden * index;
    points.push([Math.cos(angle) * ring, y, Math.sin(angle) * ring]);
  }
  return points;
}

// Only the corners are written down. The faces are worked out from them, which
// is both shorter than listing twenty triangles and self-checking: a mistake in
// a vertex gives a solid with the wrong number of faces, and the tests say so.
const SOLIDS = {
  4: TETRA_VERTICES,
  6: CUBE_VERTICES,
  8: OCTA_VERTICES,
  10: bipyramid(5),
  12: DODECA_VERTICES,
  20: ICOSA_VERTICES,
  100: sphereVertices(52),
};

const SHAPES = Object.keys(SOLIDS).map(Number).sort((a, b) => a - b);

// A two-sided die is a coin, and there is no polyhedron with two faces. It is
// built by hand instead: two discs back to back, with a band of narrow panels
// around them so that it still has an edge to catch the light when it flips.
//
// The band is scenery. Only the two discs are faces, so a flip can only ever
// come down heads or tails — a coin landing on its edge is a good story and a
// bad dice roller.
const COIN_PANELS = 16;

function coinGeometry(radius) {
  const size = radius * 2;
  const thickness = radius * 0.32;
  const half = thickness / 2;

  // Rounded, not clipped. Every other face is a polygon cut out with a
  // clip-path, but a disc is a shape the browser already knows how to draw, and
  // asking it to clip one instead left the coin square-edged the moment it came
  // to rest facing the viewer.
  const disc = (towards) => ({
    transform: `matrix3d(${towards},0,0,0, 0,1,0,0, 0,0,${towards},0, 0,0,${round(towards * half)},1)`,
    borderRadius: '50%',
    towardsViewer: towards,
    normal: [0, 0, towards],
    up: [towards, 0, 0],
    // The whole disc is room for the number.
    room: 0.5,
  });

  const step = (2 * Math.PI) / COIN_PANELS;
  const apothem = radius * Math.cos(step / 2);
  const panelWidth = 2 * radius * Math.sin(step / 2);

  const rim = [];
  for (let index = 0; index < COIN_PANELS; index += 1) {
    const angle = (index + 0.5) * step;
    const nx = Math.cos(angle);
    const ny = Math.sin(angle);
    // Local axes: along the rim, then across its thickness.
    const matrix = [
      -ny, nx, 0, 0,
      0, 0, 1, 0,
      nx, ny, 0, 0,
      round(nx * apothem), round(ny * apothem), 0, 1,
    ];
    // Given a real size rather than cut out of a face-sized box with a
    // clip-path. A panel on the rim stands perpendicular to the screen when the
    // coin is lying flat, and a clip on a plane edge-on to the viewer is where
    // browsers stop agreeing with each other — one of them painted the whole
    // uncut box, which put a gold square around the coin exactly as it
    // straightened up.
    rim.push({
      transform: `matrix3d(${matrix.map(round).join(',')})`,
      width: round(panelWidth),
      height: round(thickness),
    });
  }

  return { shape: 2, size, faces: [disc(1), disc(-1)], rim, landing: 0 };
}

// Which shape to draw for a die of this many sides. A d2 is a coin; a d100 is
// thrown as the percentile die it really is, a d10 marked in tens; anything
// else with no solid of its own falls back to one that at least tumbles like a
// die.
export function dieShapeFor(sides) {
  const count = Math.max(2, Math.floor(Number(sides) || 6));
  if (count === 2) return 2;
  if (SOLIDS[count]) return count;
  return SHAPES.find((shape) => shape >= count) || 100;
}

// The faces of a convex solid, found from its corners alone.
//
// Every three corners span a plane; the plane is a face exactly when no corner
// lies outside it, and the face is then every corner sitting on it. Brute force
// over a handful of points, run once per die type at module load — a proper
// hull algorithm would be more code for the same six answers.
function hullFaces(vertices) {
  const found = new Map();

  for (let i = 0; i < vertices.length; i += 1) {
    for (let j = i + 1; j < vertices.length; j += 1) {
      for (let k = j + 1; k < vertices.length; k += 1) {
        const spanned = cross(sub(vertices[j], vertices[i]), sub(vertices[k], vertices[i]));
        if (length(spanned) < EPS) continue;

        let normal = normalize(spanned);
        const reach = dot(normal, vertices[i]);
        // Face the outside, then keep the plane only if it supports the solid.
        if (reach < 0) normal = normal.map((component) => -component);
        const depth = Math.abs(reach);
        if (vertices.some((vertex) => dot(vertex, normal) > depth + 1e-9)) continue;

        const key = normal.map((component) => Math.round(component * 1e6)).join(',');
        if (found.has(key)) continue;
        found.set(key, {
          normal,
          points: vertices.filter((vertex) => Math.abs(dot(vertex, normal) - depth) < 1e-9),
        });
      }
    }
  }

  return [...found.values()];
}

function buildFace({ points, normal }, upright = false) {
  const centre = centroidOf(points);
  // The plane's own normal, not the direction of the centroid: on a die whose
  // faces are isosceles rather than regular — the d10 — those are not the same
  // line, and using the centroid would tilt every face slightly out of true.
  const outward = normal;

  // Where the face's own X axis points decides how the polygon sits inside it,
  // and with it which way up the number reads. The face that lands is turned so
  // a corner points up and the number stays upright; the rest are scenery.
  const corner = normalize(sub(points[0], centre));
  const u = upright ? normalize(cross(corner.map((c) => -c), outward)) : corner;
  const v = cross(outward, u);

  const flat = points
    .map((point) => {
      const offset = sub(point, centre);
      return { x: dot(offset, u), y: dot(offset, v) };
    })
    .sort((a, b) => Math.atan2(a.y, a.x) - Math.atan2(b.y, b.x));

  return { normal: outward, u, v, centre, flat, room: incircle(flat) };
}

// How much room a face has for a number: the largest circle that fits inside
// the polygon, centred on it. A triangle at a given width holds far less than a
// square does, which is why a number sized to the die rather than to the face
// gets its corners cut off on a d20.
function incircle(flat) {
  let room = Infinity;
  for (let index = 0; index < flat.length; index += 1) {
    const from = flat[index];
    const to = flat[(index + 1) % flat.length];
    const edge = Math.hypot(to.x - from.x, to.y - from.y) || 1;
    // Distance from the face's centre to this edge.
    room = Math.min(room, Math.abs((to.x - from.x) * -from.y - (to.y - from.y) * -from.x) / edge);
  }
  return room;
}

// Turn the whole solid so the face that lands looks straight out of the screen.
//
// Without this the die rests on whichever face happened to be nearest the
// viewer, which on an icosahedron is several degrees off — the result reads at
// an angle, like a die photographed from the side.
function alignedFaces(vertices) {
  const raw = hullFaces(vertices);

  let landing = 0;
  raw.forEach((face, index) => {
    if (face.normal[2] > raw[landing].normal[2]) landing = index;
  });

  const built = raw.map((face, index) => buildFace(face, index === landing));
  const anchor = built[landing];
  // The rotation that takes the landing face's own axes onto the screen's: read
  // every vector back in that basis and it is applied to the whole solid at
  // once.
  const toScreen = (w) => [dot(w, anchor.u), dot(w, anchor.v), dot(w, anchor.normal)];

  return {
    landing,
    faces: built.map((face) => ({
      ...face,
      u: toScreen(face.u),
      v: toScreen(face.v),
      normal: toScreen(face.normal),
      centre: toScreen(face.centre),
    })),
  };
}

// Everything a die needs to be drawn once: a box size, and for each face the
// transform that puts it in place and the polygon that cuts it to shape.
//
// `landing` is the face that ends up towards the viewer when the die is at
// rest — the one that has to carry the number that was actually rolled.
const geometryCache = new Map();
// The hull does not depend on how big the die is drawn, and finding a
// hundred-faced one is the only slow thing in this file.
const hullCache = new Map();

function solidFor(shape) {
  const cached = hullCache.get(shape);
  if (cached) return cached;
  const built = alignedFaces(SOLIDS[shape]);
  hullCache.set(shape, built);
  return built;
}

export function dieGeometry(sides, radius = 16) {
  const shape = dieShapeFor(sides);
  const cacheKey = `${shape}:${radius}`;
  // Six shapes at a handful of sizes, built once: a hundred dice thrown across
  // a session should not each rediscover what an icosahedron looks like.
  const cached = geometryCache.get(cacheKey);
  if (cached) return cached;

  if (shape === 2) {
    const coin = coinGeometry(radius);
    geometryCache.set(cacheKey, coin);
    return coin;
  }

  const circumradius = Math.max(...SOLIDS[shape].map(length));
  const scale = radius / circumradius;
  const size = radius * 2;

  const solid = solidFor(shape);
  const faces = solid.faces.map((face) => {
    // Translate to the face's own centre: the clip-path polygon is written
    // around that point, so the two have to agree.
    const offset = face.centre.map((component) => component * scale);
    const matrix = [
      ...face.u, 0,
      ...face.v, 0,
      ...face.normal, 0,
      ...offset, 1,
    ];
    const polygon = face.flat
      .map(({ x, y }) => `${percent(x * scale, size)}% ${percent(y * scale, size)}%`)
      .join(', ');

    return {
      transform: `matrix3d(${matrix.map(round).join(',')})`,
      clipPath: `polygon(${polygon})`,
      towardsViewer: face.normal[2],
      // Which way the face looks and which way is up on it, for whoever has to
      // work out what a tumbling die is showing.
      normal: face.normal,
      up: face.u,
      // Radius of the biggest circle that fits on the face, as a fraction of
      // the die's box, so a caller can size a number to the room it has.
      room: round((face.room * scale) / size),
    };
  });

  const geometry = { shape, size, faces, landing: solid.landing };
  geometryCache.set(cacheKey, geometry);
  return geometry;
}

function percent(value, size) {
  return round(50 + (value / size) * 100);
}

function round(value) {
  return Math.round(value * 10000) / 10000;
}
