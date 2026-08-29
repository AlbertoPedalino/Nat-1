import { createAtmosphereFragmentShader } from './common.js';

export default createAtmosphereFragmentShader({
  body: `
  float height = v_uv.y;
  float flameLean = wind.x * height * 0.82;
  vec2 flameFlow = vec2((p.x - flameLean) * 4.1, height * 4.8 - time * 1.65);
  float warp = fbm(flameFlow * vec2(0.72, 0.48) + 5.0);
  float detail = fbm(flameFlow + vec2((warp - 0.5) * 2.2, -time * 0.55));
  float body = detail * 0.72 + warp * 0.52 - height * 0.92;
  float flame = smoothstep(0.2, 0.64, body);
  float core = smoothstep(0.48, 0.82, body + (1.0 - height) * 0.18);
  float smokeNoise = fbm(vec2((p.x - flameLean * 1.5) * 2.15 + warp, height * 2.7 - time * 0.52));
  float smoke = smoothstep(0.48, 0.76, smokeNoise) * smoothstep(0.22, 0.72, height);
  smoke *= 1.0 - smoothstep(0.84, 1.0, height);
  float heatBand = pow(0.5 + 0.5 * sin(p.x * 31.0 + height * 19.0 - time * 4.0 + warp * 7.0), 8.0);
  heatBand *= (1.0 - smoothstep(0.08, 0.68, height)) * (1.0 - flame);
  color = mix(vec3(0.16, 0.025, 0.008), vec3(1.0, 0.24, 0.015), flame);
  color = mix(color, vec3(1.0, 0.86, 0.24), core);
  color = mix(color, vec3(0.12, 0.11, 0.12), smoke * 0.78);
  alpha = flame * 0.88 + core * 0.32 + smoke * 0.38 + heatBand * 0.13;`,
});
