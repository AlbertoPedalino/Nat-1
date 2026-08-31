import { createAtmosphereFragmentShader, DUST_MOTE_GLSL } from './common.js';

const HEAT_HELPERS = `
// Two moving sine fields create the sideways shimmer without multi-octave
// noise. They retain the irregular, rising-air silhouette while doing a small,
// fixed amount of work for every fragment.
float heatSheet(vec2 p, vec2 uv, float time, float phase) {
  float sideways = sin(p.x * 7.0 + time * 0.48 + phase) * 0.72
    + sin(p.x * 15.0 - time * 0.29 - phase) * 0.24;
  float wide = sin(uv.y * (27.0 + uv.y * 13.0) - time * 2.35 + sideways + phase);
  float fine = sin(uv.y * 18.0 - time * 3.7 - p.x * 2.9 + phase * 1.6);
  return wide * 0.7 + fine * 0.3;
}

// A compact sun, halo, diagonal streak and slowly moving ray fan. The former
// version generated the fan with two noise fields and a five-octave FBM; this
// analytic version gives the same visual cues with no per-pixel noise loops.
vec3 sunGlow(vec2 uv, float aspect, float time, float seed) {
  vec2 sun = vec2(0.74, 0.88);
  vec2 offset = (uv - sun) * vec2(aspect, 1.0);
  float dist = length(offset);
  float phase = mod(seed, 6.2831853);

  float core = pow(1.0 - smoothstep(0.0, 0.05, dist), 2.0);
  float halo = pow(1.0 - smoothstep(0.0, 0.46, dist), 2.4);

  float streakSway = sin(mod(time, 78.5398) * 0.08 + phase) * 0.065;
  vec2 ray = normalize(vec2(0.58 + streakSway, 1.0));
  float acrossRay = abs(dot(offset, vec2(-ray.y, ray.x)));
  float streak = pow(1.0 - smoothstep(0.0, 0.17, acrossRay), 1.6)
    * (0.32 + 0.68 * (1.0 - smoothstep(0.0, 1.15, dist)));

  vec2 rayDirection = offset / max(dist, 0.001);
  float fanMotion = sin(mod(time, 41.8879) * 0.15 + phase) * 0.8;
  float fanPattern = 0.5 + 0.5 * sin(
    rayDirection.x * 13.0 + rayDirection.y * 8.0 + fanMotion
  );
  float cones = smoothstep(0.66, 0.91, fanPattern)
    * smoothstep(0.03, 0.19, dist)
    * (1.0 - smoothstep(0.28, 1.2, dist));

  vec2 ghostOffset = (uv - (vec2(1.0) - sun)) * vec2(aspect, 1.0);
  float ghost = pow(1.0 - smoothstep(0.0, 0.19, length(ghostOffset)), 2.6);

  return vec3(1.0, 0.98, 0.94) * core
    + vec3(1.0, 0.71, 0.33) * halo * 0.62
    + vec3(1.0, 0.87, 0.64) * streak * 0.34
    + vec3(1.0, 0.84, 0.55) * cones * 0.42
    + vec3(1.0, 0.58, 0.30) * ghost * 0.22;
}`;

// The map is a sibling <img>, so the canvas cannot physically refract its
// pixels. Overlay blending uses moving light and dark bands to preserve that
// impression without an off-screen copy of the entire map every frame.
export default createAtmosphereFragmentShader({
  helpers: DUST_MOTE_GLSL + HEAT_HELPERS,
  body: `
  float distant = smoothstep(0.1, 0.72, v_uv.y);
  float heatBand = smoothstep(0.12, 0.44, v_uv.y)
    * (1.0 - smoothstep(0.5, 0.78, v_uv.y));
  float foreground = 1.0 - smoothstep(0.0, 0.42, v_uv.y);

  // Wide thermal columns modulate the otherwise regular wave bands. Both
  // fields are analytic and continuous, so there are no loops or branch-heavy
  // neighbouring-cell searches in the hot-air portion of the shader.
  float columns = 0.5 + 0.5 * sin(
    p.x * 9.0 + sin(p.x * 3.2 - time * 0.43) * 1.35 + time * 0.21
  );
  columns = smoothstep(0.22, 0.82, columns);
  float strength = heatBand * (0.48 + columns * 0.72);

  float sheetR = heatSheet(p, v_uv, time, -0.3) * strength;
  float sheetG = heatSheet(p, v_uv, time, 0.0) * strength;
  float sheetB = heatSheet(p, v_uv, time, 0.3) * strength;
  vec3 shimmer = vec3(sheetR, sheetG, sheetB);
  float crest = pow(max(0.0, sheetG), 3.0);

  // Two cheap single-cell mote fields replace three layers that searched all
  // nine adjacent cells for every fragment. Their scales keep any cell edge
  // too small to notice after the reduced atmosphere canvas is upsampled.
  float grainLit = dustMoteLayer(
    p, rotate2d(0.09) * wind, 18.0, time * 3.2, 23.0, 0.07, 0.92
  ) * (1.0 + foreground * 0.3);
  float grainShadow = dustMoteLayer(
    rotate2d(1.17) * p + 6.4, rotate2d(1.22) * wind,
    25.0, time * 2.1, 71.0, 0.055, 0.965
  );

  float mirage = heatBand * (
    0.55 + 0.45 * sin(p.x * 3.7 - time * 0.9 + columns * 2.4)
  );
  vec3 glow = sunGlow(v_uv, aspect, time, u_seed * 0.31);
  float glowPeak = max(glow.r, max(glow.g, glow.b));

  vec3 scorch = mix(vec3(0.44, 0.36, 0.27), vec3(0.72, 0.59, 0.40), distant);
  color = clamp(vec3(0.5) + shimmer * 0.5 + mirage * 0.16 + crest * 0.35, 0.0, 1.0);
  color = mix(color, scorch, 0.3);
  color = mix(color, vec3(1.0, 0.99, 0.94), grainLit);
  color = mix(color, vec3(0.26, 0.21, 0.15), grainShadow * 0.42);
  color = clamp(color + glow * 0.55, 0.0, 1.0);
  alpha = distant * 0.26 + abs(sheetG) * 0.5 + mirage * 0.18 + crest * 0.3
    + grainLit * 0.9 + grainShadow * 0.28 + glowPeak * 0.45;`,
});
