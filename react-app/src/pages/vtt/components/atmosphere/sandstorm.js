import { createAtmosphereFragmentShader } from './common.js';

export default createAtmosphereFragmentShader({
  body: `
  vec2 q = rotate2d(u_angle + 0.94) * p;
  vec2 flow = q * vec2(1.25, 3.7) + vec2(time * 0.36, -time * 0.92);
  float warp = fbm(flow * 0.65 + 5.0);
  float body = fbm(flow + vec2(warp * 2.2, -warp * 0.8));
  float ribbons = 0.5 + 0.5 * sin((q.y + q.x * 0.26 - time * 0.72) * 24.0 + body * 9.0);
  float front = smoothstep(0.25, 0.74, body * 0.82 + ribbons * 0.36);
  color = mix(vec3(0.27, 0.105, 0.025), vec3(0.92, 0.58, 0.19), body + ribbons * 0.18);
  alpha = 0.19 + front * 0.69;`,
});
