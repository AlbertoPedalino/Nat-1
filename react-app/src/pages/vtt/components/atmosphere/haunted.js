import { createAtmosphereFragmentShader } from './common.js';

const HAUNTED_HELPERS = `
float borderMask(vec2 uv) {
  float nearestEdge = min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y));
  return 1.0 - smoothstep(0.035, 0.34, nearestEdge);
}

float hauntedDustLayer(vec2 uv, float scale, float time, float salt) {
  vec2 grid = uv * scale;
  vec2 cell = floor(grid);
  vec2 local = fract(grid) - 0.5;
  float identity = hash(cell + vec2(salt, salt * 0.37));
  float phase = identity * 6.2831853;
  vec2 center = vec2(
    hash(cell + vec2(salt + 7.0, 19.0)),
    hash(cell + vec2(31.0, salt + 4.0))
  ) - 0.5;
  center *= 0.58;
  center += vec2(
    sin(time * (0.31 + identity * 0.18) + phase) * 0.12,
    sin(time * (0.24 + identity * 0.21) + phase * 1.7) * 0.16
  );
  float mote = 1.0 - smoothstep(0.052, 0.07, length(local - center));
  float exists = step(0.94, hash(cell + vec2(salt + 43.0, 11.0)));
  return mote * exists;
}
`;

export default createAtmosphereFragmentShader({
  helpers: HAUNTED_HELPERS,
  body: `
  vec2 drift = p * 1.52 + wind * time * 0.012;
  vec2 warp = vec2(
    fbm(drift * 0.7 + vec2(time * 0.014, 8.0)),
    fbm(drift * 0.62 - vec2(17.0, time * 0.011))
  );
  float edge = borderMask(v_uv);
  float fogBody = fbm(drift + (warp - 0.5) * 2.9);
  float fogDetail = fbm(p * 3.4 - wind * time * 0.021 + warp * 1.4);
  float borderFog = edge * (0.24 + smoothstep(0.25, 0.72, fogBody * 0.74 + fogDetail * 0.43) * 0.88);
  float denseEdge = edge * edge * (0.18 + smoothstep(0.16, 0.64, fogDetail + 0.08) * 0.82);

  float shutter = noise(vec2(time * 0.46, u_seed * 0.027));
  float slowPulse = 0.62 + noise(vec2(time * 0.17 + 9.0, u_seed * 0.019)) * 0.38;
  float briefDim = smoothstep(0.78, 0.94, shutter) * 0.68;
  float lightLevel = slowPulse * (1.0 - briefDim);
  vec2 lightTravel = vec2(
    sin(time * 0.075 + u_seed * 0.004),
    cos(time * 0.061 + u_seed * 0.003)
  );
  float movingLight = fbm(p * 0.92 + lightTravel * 1.45 + warp * 0.42);
  float illuminatedHaze = (borderFog * 0.78 + denseEdge * 0.34)
    * (0.52 + movingLight * 0.48) * lightLevel;
  float dustFine = hauntedDustLayer(v_uv, 22.0, time, 17.0);
  float dustNear = hauntedDustLayer(v_uv + vec2(0.19, 0.27), 13.0, time * 0.84, 47.0);
  float dust = dustFine * 0.58 + dustNear;
  float ambientDust = dust * 0.88;
  float litDust = dust * (edge * 0.22 + illuminatedHaze * 0.76) * lightLevel;

  float darkness = borderFog * 0.56 + denseEdge * 0.4;
  color = mix(vec3(0.018, 0.025, 0.045), vec3(0.46, 0.64, 0.61),
    clamp(illuminatedHaze * 1.24 + ambientDust * 0.96 + litDust, 0.0, 1.0));
  alpha = darkness + illuminatedHaze * 0.22 + ambientDust * 0.72 + litDust * 0.36;`,
});
