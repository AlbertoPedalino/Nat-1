import { createAtmosphereFragmentShader } from './common.js';

export default createAtmosphereFragmentShader({
  body: `
  vec2 flow = p * 1.25 + wind * time * 0.06;
  vec2 warp = vec2(fbm(flow * 0.72 + 4.1), fbm(flow * 0.68 + 19.7));
  float body = fbm(flow + (warp - 0.5) * 2.6);
  float folds = fbm(p * 3.2 - wind * time * 0.085 + warp * 1.3);
  float billow = smoothstep(0.24, 0.72, body * 0.82 + folds * 0.35);
  float depth = smoothstep(0.05, 0.95, v_uv.y + body * 0.18);
  color = mix(vec3(0.34, 0.42, 0.47), vec3(0.86, 0.9, 0.89), body + folds * 0.25);
  alpha = 0.17 + billow * (0.48 + depth * 0.2);`,
});
