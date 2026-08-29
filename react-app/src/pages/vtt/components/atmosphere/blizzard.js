import { createAtmosphereFragmentShader } from './common.js';

export default createAtmosphereFragmentShader({
  body: `
  vec2 q = rotate2d(u_angle + 1.13) * p;
  float broad = fbm(q * vec2(1.5, 5.8) + vec2(time * 0.72, -time * 1.8));
  float squall = smoothstep(0.27, 0.76, broad + noise(q * 8.0 - time * 2.2) * 0.34);
  float wave = 0.5 + 0.5 * sin((q.x + q.y * 0.31 + time * 0.78) * 34.0 + broad * 8.0);
  float whiteStreak = pow(wave, 7.0) * smoothstep(0.25, 0.82, broad);
  color = mix(vec3(0.47, 0.58, 0.68), vec3(0.97, 0.99, 1.0), squall + whiteStreak);
  alpha = 0.2 + squall * 0.5 + whiteStreak * 0.62;`,
});
