import { createAtmosphereFragmentShader, RAIN_SHEET_GLSL } from './common.js';

export default createAtmosphereFragmentShader({
  helpers: RAIN_SHEET_GLSL,
  body: `
  float rain = rainSheet(along, 34.0, time * 2.7, 2.0)
    + rainSheet(along + vec2(2.17, 0.7), 57.0, time * 4.1, 9.0) * 0.62;
  float nearMist = fbm(p * 2.0 + wind * time * 0.12);
  float distantMist = fbm(p * 0.85 - wind * time * 0.045 + 13.0);
  float wetVeil = smoothstep(0.28, 0.76, nearMist * 0.7 + distantMist * 0.45);
  color = mix(vec3(0.075, 0.12, 0.18), vec3(0.72, 0.86, 0.96), smoothstep(0.04, 0.72, rain));
  alpha = 0.1 + wetVeil * 0.2 + rain * 0.62;`,
});
