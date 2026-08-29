import { createAtmosphereFragmentShader, RAIN_SHEET_GLSL } from './common.js';

export default createAtmosphereFragmentShader({
  helpers: RAIN_SHEET_GLSL,
  body: `
  float rain = rainSheet(along, 38.0, time * 3.5, 3.0)
    + rainSheet(along + vec2(1.4, 2.3), 64.0, time * 5.0, 11.0) * 0.72;
  vec2 cloudFlow = p * 1.35 + wind * time * 0.055;
  float cloudWarp = fbm(cloudFlow * 0.72 + 7.0);
  float cloud = fbm(cloudFlow + vec2(cloudWarp * 1.9, -cloudWarp * 1.25));
  float cycle = mod(time + u_seed * 0.017, 7.5);
  float flash = 1.0 - smoothstep(0.0, 0.18, abs(cycle - 0.22));
  flash += (1.0 - smoothstep(0.0, 0.24, abs(cycle - 0.68))) * 0.58;
  color = mix(vec3(0.018, 0.03, 0.065), vec3(0.82, 0.91, 1.0), clamp(rain * 0.8 + flash, 0.0, 1.0));
  alpha = 0.2 + smoothstep(0.28, 0.78, cloud) * 0.31 + rain * 0.65 + flash * 0.72;`,
});
