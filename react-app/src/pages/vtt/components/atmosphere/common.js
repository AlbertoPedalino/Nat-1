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
