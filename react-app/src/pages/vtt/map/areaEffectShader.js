// The animated inside of an area of effect. One program draws every area: the
// area's quad is drawn with its shape and effect as uniforms, the fragment
// shader cuts the shape out with the same edge distance as
// shared/vtt/map/areas.js and fills it with the effect's look.
//
// Effects are numbered by their position in AREA_EFFECTS (1-based); 0 draws
// nothing. Patterns are measured in cells, so they keep their size relative to
// the map at any zoom.

export const AREA_SHAPE_INDEX = Object.freeze({ circle: 0, square: 1, cone: 2, line: 3 });

export const AREA_VERTEX_SHADER = `
attribute vec2 a_position;
uniform vec2 u_resolution;
varying vec2 v_px;
void main() {
  v_px = a_position;
  vec2 clip = a_position / u_resolution * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
}`;

export const AREA_FRAGMENT_SHADER = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec2 v_px;
uniform vec2 u_origin;
uniform float u_reach;
uniform float u_angle;
uniform float u_breadth;
uniform float u_shape;
uniform float u_effect;
uniform float u_time;
uniform float u_cell;
uniform float u_seed;
uniform float u_opacity;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7)) + u_seed) * 43758.5453);
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

// Signed distance in pixels to the area's edge, negative inside.
float edgeDistance(vec2 l) {
  if (u_shape < 0.5) return length(l) - u_reach;
  if (u_shape < 1.5) return max(abs(l.x), abs(l.y)) - u_reach;
  vec2 dir = vec2(cos(u_angle), sin(u_angle));
  float along = dot(l, dir);
  float across = abs(dot(l, vec2(-dir.y, dir.x)));
  float ends = max(-along, along - u_reach);
  if (u_shape < 2.5) return max(ends, (across - along * 0.5) * 0.8944);
  return max(ends, across - u_breadth * 0.5);
}

void main() {
  vec2 l = v_px - u_origin;
  float d = edgeDistance(l);
  float soft = max(1.5, u_cell * 0.08);
  float mask = 1.0 - smoothstep(-soft, soft * 0.5, d);
  if (mask <= 0.0) discard;

  vec2 q = l / max(1.0, u_cell);
  float t = u_time;
  // Brighter towards the rim, so the edge of the area reads even where the
  // pattern happens to be quiet.
  float rim = smoothstep(-u_cell * 0.8, 0.0, d);
  vec3 color = vec3(0.0);
  float alpha = 0.0;

  if (u_effect < 1.5) {
    // Fire: flames licking upward, with embers riding them.
    vec2 f = q * 1.6;
    float w = fbm(f * 0.7 + vec2(0.0, t * 0.6));
    float n = fbm(f + vec2(w * 1.5, t * 1.4));
    float heat = n * 1.1 + w * 0.35 - 0.35 + rim * 0.25;
    color = mix(vec3(0.6, 0.08, 0.0), vec3(1.0, 0.42, 0.04), smoothstep(0.05, 0.45, heat));
    color = mix(color, vec3(1.0, 0.88, 0.4), smoothstep(0.45, 0.78, heat));
    alpha = 0.5 + smoothstep(0.1, 0.6, heat) * 0.42;
    vec2 g = q * 3.0 + vec2(0.0, t * 1.8);
    vec2 c = floor(g);
    vec2 offset = (vec2(hash(c + 1.3), hash(c + 7.1)) - 0.5) * 0.6;
    float ember = step(0.86, hash(c)) * (1.0 - smoothstep(0.03, 0.09, length(fract(g) - 0.5 - offset)));
    color += ember * vec3(1.0, 0.7, 0.3);
    alpha += ember * 0.5;
  } else if (u_effect < 2.5) {
    // Poison: a slow, folding green cloud.
    vec2 f = q * 0.9;
    vec2 w = vec2(fbm(f + t * 0.12), fbm(f + 5.2 - t * 0.1));
    float n = fbm(f + w * 1.8 + vec2(t * 0.05, -t * 0.07));
    color = mix(vec3(0.15, 0.36, 0.06), vec3(0.6, 0.95, 0.3), smoothstep(0.25, 0.7, n));
    alpha = 0.42 + smoothstep(0.25, 0.75, n) * 0.4 + rim * 0.15;
  } else if (u_effect < 3.5) {
    // Cold: ice crystals catching the light.
    vec2 g = q * 2.2;
    vec2 id = floor(g);
    vec2 local = fract(g);
    float f1 = 8.0;
    float f2 = 8.0;
    vec2 nearest = id;
    for (int y = -1; y <= 1; y++) {
      for (int x = -1; x <= 1; x++) {
        vec2 cell = id + vec2(float(x), float(y));
        vec2 seed = vec2(hash(cell), hash(cell + 4.7));
        float dist = length(vec2(float(x), float(y)) + seed - local);
        if (dist < f1) { f2 = f1; f1 = dist; nearest = cell; }
        else if (dist < f2) { f2 = dist; }
      }
    }
    float edges = 1.0 - smoothstep(0.0, 0.08, f2 - f1);
    float shimmer = 0.5 + 0.5 * sin(t * 1.5 + hash(nearest) * 6.2831);
    float base = fbm(q * 1.2 + t * 0.05);
    color = mix(vec3(0.55, 0.8, 1.0), vec3(0.95, 0.99, 1.0), edges * 0.8 + shimmer * 0.15);
    alpha = 0.22 + base * 0.2 + edges * 0.45 + rim * 0.25;
  } else if (u_effect < 4.5) {
    // Acid: a bubbling pool.
    float base = fbm(q * 1.1 + vec2(t * 0.08, t * 0.05));
    vec2 g = q * 2.5;
    vec2 id = floor(g);
    vec2 offset = (vec2(hash(id + 1.7), hash(id + 9.2)) - 0.5) * 0.3;
    float phase = fract(t * 0.35 + hash(id));
    float ring = 1.0 - smoothstep(0.0, 0.05, abs(length(fract(g) - 0.5 - offset) - phase * 0.38));
    ring *= (1.0 - phase) * step(0.45, hash(id + 3.3));
    color = mix(vec3(0.45, 0.6, 0.05), vec3(0.88, 0.98, 0.3), smoothstep(0.25, 0.75, base));
    color += ring * vec3(0.9, 1.0, 0.5) * 0.6;
    alpha = 0.5 + base * 0.3 + ring * 0.4 + rim * 0.15;
  } else if (u_effect < 5.5) {
    // Lightning: arcs that jump to a new path several times a second.
    float beat = floor(t * 7.0);
    float flash = step(0.6, hash(vec2(beat, 3.1)));
    float n = fbm(q * 1.3 + vec2(beat * 1.7, beat * 0.9));
    float n2 = fbm(q * 2.6 - vec2(beat * 0.7, beat * 1.3));
    float glow = pow(1.0 - abs(n * 2.0 - 1.0), 14.0) + pow(1.0 - abs(n2 * 2.0 - 1.0), 18.0) * 0.7;
    color = mix(vec3(0.1, 0.15, 0.4), vec3(0.85, 0.92, 1.0), clamp(glow, 0.0, 1.0));
    alpha = 0.22 + glow * (0.5 + flash * 0.5) + flash * 0.08 + rim * 0.15;
  } else if (u_effect < 6.5) {
    // Necrotic: a dark vortex turning about the origin.
    float r = length(q);
    float a = atan(q.y, q.x) + t * 0.35 - r * 0.6;
    float n = fbm(vec2(cos(a), sin(a)) * r * 1.1 + vec2(t * 0.05));
    color = mix(vec3(0.05, 0.0, 0.08), vec3(0.55, 0.25, 0.75), smoothstep(0.35, 0.8, n));
    alpha = 0.45 + n * 0.3 + rim * 0.15;
  } else if (u_effect < 7.5) {
    // Radiant: rays from the origin and a slow pulse.
    float r = length(q);
    float a = atan(q.y, q.x);
    float rays = pow(0.5 + 0.5 * sin(a * 10.0 + t * 0.6 + fbm(q * 0.8) * 3.0), 6.0);
    float pulse = 0.5 + 0.5 * sin(t * 1.6);
    float core = exp(-r / max(0.5, (u_reach / max(1.0, u_cell)) * 0.9));
    vec2 g = q * 3.0;
    float spark = 1.0 - smoothstep(0.02, 0.12, length(fract(g) - 0.5));
    float twinkle = step(0.9, hash(floor(g))) * spark
      * pow(0.5 + 0.5 * sin(t * 3.0 + hash(floor(g) + 2.0) * 6.2831), 8.0);
    color = mix(vec3(1.0, 0.78, 0.3), vec3(1.0, 0.97, 0.8), core * 0.7 + rays * 0.3 + twinkle);
    alpha = 0.32 + rays * 0.35 + core * 0.45 * (0.7 + pulse * 0.3) + twinkle * 0.4 + rim * 0.2;
  } else if (u_effect < 8.5) {
    // Darkness: near-opaque, barely stirring.
    float n = fbm(q * 0.7 + vec2(t * 0.04, -t * 0.03));
    color = vec3(0.02, 0.01, 0.04) + n * vec3(0.06, 0.03, 0.09);
    alpha = 0.82 + n * 0.1;
  } else {
    // Thorns & roots: knotted roots slowly writhing over dark earth, hooked
    // spines growing out of them, thin green tendrils between (Spike Growth,
    // Entangle, Plant Growth…).
    vec2 f = q * 0.6;
    vec2 w = vec2(fbm(f * 0.8 + t * 0.04), fbm(f * 0.8 + 3.7 - t * 0.035));
    float ridge = 1.0 - abs(fbm(f + w * 1.2) * 2.0 - 1.0);
    float root = smoothstep(0.88, 0.94, ridge);
    float reach = smoothstep(0.72, 0.9, ridge);
    float swell = smoothstep(0.9, 1.0, ridge);
    float bark = fbm(q * vec2(7.0, 2.5) + w * 4.0);
    float tendril = smoothstep(0.93, 0.98, 1.0 - abs(fbm(q * 1.6 + w * 0.8 + 11.3) * 2.0 - 1.0));
    // A hooked spine in some cells, kept near a root: dark at the base,
    // pale at the tip.
    vec2 g = q * 2.0;
    vec2 id = floor(g);
    vec2 local = fract(g) - 0.5 - (vec2(hash(id + 2.1), hash(id + 5.9)) - 0.5) * 0.3;
    float a = hash(id + 8.3) * 6.2831 + sin(t * 0.7 + hash(id) * 6.2831) * 0.1;
    vec2 p = vec2(cos(a) * local.x + sin(a) * local.y, -sin(a) * local.x + cos(a) * local.y);
    float along = p.x + 0.22;
    float bend = p.y - along * along * 1.2;
    float spine = step(0.0, along) * step(along, 0.48)
      * (1.0 - smoothstep(0.0, 0.02, abs(bend) - 0.1 * (1.0 - along / 0.48)));
    spine *= step(0.45, hash(id + 1.1)) * reach;
    float soil = fbm(q * 0.9 + 4.0);
    color = mix(vec3(0.06, 0.05, 0.02), vec3(0.13, 0.19, 0.05), smoothstep(0.35, 0.75, soil));
    color = mix(color, vec3(0.3, 0.45, 0.12), tendril * 0.8);
    vec3 wood = mix(vec3(0.22, 0.13, 0.05), vec3(0.5, 0.34, 0.16), swell * 0.7 + bark * 0.5);
    color = mix(color, wood, root);
    color = mix(color, mix(vec3(0.42, 0.27, 0.11), vec3(0.93, 0.87, 0.66), smoothstep(0.0, 0.3, along)), spine);
    alpha = 0.45 + soil * 0.15 + tendril * 0.2 + root * 0.35 + spine * 0.45 + rim * 0.15;
  }

  gl_FragColor = vec4(color, clamp(alpha, 0.0, 0.95) * mask * u_opacity);
}`;
