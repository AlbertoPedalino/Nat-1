import { createAtmosphereFragmentShader } from './common.js';

const SNOW_HELPERS = `
float snowLayer(vec2 p, float scale, float time, float salt) {
  vec2 q = p * scale;
  q.y += time * (0.42 + salt * 0.012);
  q.x += sin(q.y * 0.72 + time * 0.48 + salt) * 0.38;
  vec2 cell = floor(q);
  vec2 local = fract(q) - 0.5;
  float variation = hash(cell + vec2(salt));
  local.x += (variation - 0.5) * 0.42;
  float radius = length(local);
  float disc = 1.0 - smoothstep(0.055, 0.16 + variation * 0.055, radius);
  float cross = 1.0 - smoothstep(0.035, 0.075, min(abs(local.x), abs(local.y)));
  return max(disc, cross * disc * 0.7) * smoothstep(0.16, 0.92, variation);
}`;

export default createAtmosphereFragmentShader({
  helpers: SNOW_HELPERS,
  body: `
  vec2 drift = vec2(wind.x, 0.0) * time * 0.055;
  float farSnow = snowLayer(p + drift, 15.0, time * 0.52, 3.0) * 0.42;
  float midSnow = snowLayer(p * 1.04 + drift * 1.35 + 8.7, 9.5, time * 0.72, 11.0) * 0.72;
  float nearSnow = snowLayer(p * 1.08 + drift * 1.8 + 17.3, 5.8, time * 0.92, 19.0);
  float snow = farSnow + midSnow + nearSnow;
  float coldHaze = smoothstep(0.38, 0.78, fbm(p * 1.7 + wind * time * 0.045 + 6.0));
  color = mix(vec3(0.55, 0.68, 0.8), vec3(1.0), clamp(snow, 0.0, 1.0));
  alpha = 0.06 + coldHaze * 0.2 + snow * 0.88;`,
});
