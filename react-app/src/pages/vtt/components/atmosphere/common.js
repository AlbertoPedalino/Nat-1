export const ATMOSPHERE_VERTEX_SHADER = `
attribute vec2 a_position;
varying vec2 v_uv;
void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;

const CORE_GLSL = `
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7)) + u_seed * 0.013) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0)), f.x), f.y);
}

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 5; i++) {
    value += amplitude * noise(p);
    p = p * 2.03 + vec2(19.1, 7.7);
    amplitude *= 0.5;
  }
  return value;
}

mat2 rotate2d(float angle) {
  float s = sin(angle);
  float c = cos(angle);
  return mat2(c, -s, s, c);
}`;

export const RAIN_SHEET_GLSL = `
float rainSheet(vec2 p, float columns, float time, float salt) {
  vec2 q = p;
  q.x *= columns;
  q.y *= columns * 0.14;
  float column = floor(q.x);
  float phase = hash(vec2(column, salt)) * 13.0;
  float alongDrop = fract(q.y + time + phase);
  float across = abs(fract(q.x) - 0.5);
  float core = 1.0 - smoothstep(0.012, 0.075, across);
  float head = smoothstep(0.0, 0.1, alongDrop);
  float tail = 1.0 - smoothstep(0.34, 1.0, alongDrop);
  float alive = smoothstep(0.2, 0.92, hash(vec2(column, salt + 4.7)));
  return core * head * tail * alive;
}`;

export const DUST_MOTE_GLSL = `
// A drifting field of round motes: dust in a sunbeam, sand on a hot wind.
// Cell-based so each mote keeps a stable identity, size and float between
// frames instead of flickering in and out.
// The direction a mote field wanders when the caller has no opinion about it.
vec2 moteDrift(float salt) {
  return normalize(vec2(sin(salt * 1.31), cos(salt * 0.77)));
}

// Travel has to be applied here, against this small coefficient, and never by
// translating p at the call site: u_time runs to 4096, so an offset added
// outside reaches hundreds of units, and once it is multiplied by scale the
// sub-cell position that draws the mote falls below what mediump can represent.
// The motes then vanish entirely, and they do it minutes into a session rather
// than at load, which makes it look like a tuning problem instead of a numeric one.
float dustMoteLayer(vec2 p, vec2 drift, float scale, float time, float salt, float radius, float threshold) {
  vec2 grid = (p + drift * time * 0.0035) * scale;
  vec2 cell = floor(grid);
  vec2 local = fract(grid) - 0.5;
  float identity = hash(cell + vec2(salt, salt * 0.37));
  float phase = identity * 6.2831853;
  vec2 restingOffset = vec2(
    hash(cell + vec2(salt + 3.1, 17.4)),
    hash(cell + vec2(29.7, salt + 8.2))
  ) - 0.5;
  // Wide enough that a mote can sit almost anywhere in its cell. At the old 0.13
  // every mote clustered within a small box at the centre of the grid square,
  // and a field of them read as a lattice rather than as scattered dust. The
  // budget stops short of 0.5 on purpose: only this cell is sampled, so a mote
  // pushed past the edge would be cut in half instead of crossing into the next.
  restingOffset *= 0.34;
  vec2 floatingOffset = vec2(
    sin(time * (0.42 + identity * 0.3) + phase * 1.7) * 0.09,
    sin(time * (0.36 + identity * 0.38) + phase) * 0.12
  );
  float sizeSeed = hash(cell + vec2(salt + 63.0, 51.9));
  float sizeVariation = 0.42 + sizeSeed * sizeSeed * 1.75;
  float moteRadius = min(radius * sizeVariation, 0.2);
  float circle = 1.0 - smoothstep(
    moteRadius * 0.3,
    moteRadius,
    length(local - restingOffset - floatingOffset)
  );
  float exists = step(threshold, hash(cell + vec2(salt + 41.0, 9.3)));
  return circle * exists * (0.6 + sizeVariation * 0.28);
}`;

export function createAtmosphereFragmentShader({ helpers = '', body }) {
  return `
precision mediump float;
varying vec2 v_uv;
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_intensity;
uniform float u_angle;
uniform float u_speed;
uniform float u_seed;

${CORE_GLSL}
${helpers}

void main() {
  float aspect = u_resolution.x / max(1.0, u_resolution.y);
  vec2 p = (v_uv - 0.5) * vec2(aspect, 1.0);
  vec2 wind = vec2(sin(u_angle), -cos(u_angle));
  vec2 along = rotate2d(u_angle) * p;
  float time = u_time * u_speed;
  vec3 color = vec3(0.7);
  float alpha = 0.0;

${body}

  float presence = 0.28 + u_intensity * 0.86;
  gl_FragColor = vec4(color, clamp(alpha * presence, 0.0, 0.92));
}`;
}
