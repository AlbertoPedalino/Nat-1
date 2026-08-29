import { createAtmosphereFragmentShader } from './common.js';

const HAUNTED_HELPERS = `
float borderMask(vec2 uv) {
  float nearestEdge = min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y));
  return 1.0 - smoothstep(0.035, 0.34, nearestEdge);
}

float hauntedLightPool(vec2 uv, vec2 center, vec2 reach, float angle) {
  vec2 local = rotate2d(angle) * (uv - center);
  float distanceFromLight = length(local / reach);
  return 1.0 - smoothstep(0.16, 1.0, distanceFromLight);
}

float hauntedDustLayer(
  vec2 uv,
  float scale,
  float time,
  float salt,
  float threshold,
  float radius
) {
  vec2 driftDirection = normalize(vec2(sin(salt * 1.73), cos(salt * 0.91)));
  vec2 grid = (uv + driftDirection * time * 0.0032) * scale;
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
  float mote = 1.0 - smoothstep(radius * 0.28, radius, length(local - center));
  float exists = step(threshold, hash(cell + vec2(salt + 43.0, 11.0)));
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
    noise(vec2(time * 0.052 + 3.0, u_seed * 0.011)),
    noise(vec2(time * 0.043 + 19.0, u_seed * 0.017 + 7.0))
  ) * 3.0 - 1.5;
  float movingLight = fbm(p * 0.92 + lightTravel * 1.45 + warp * 0.42);
  vec2 lightCenterA = vec2(
    noise(vec2(time * 0.046 + 31.0, u_seed * 0.009)),
    noise(vec2(time * 0.039 + 67.0, u_seed * 0.013 + 5.0))
  ) * 1.42 - 0.21;
  vec2 lightCenterB = vec2(
    noise(vec2(time * 0.031 + 103.0, u_seed * 0.015)),
    noise(vec2(time * 0.054 + 149.0, u_seed * 0.007 + 13.0))
  ) * 1.46 - 0.23;
  float reachPulseA = noise(vec2(time * 0.038 + 181.0, u_seed * 0.012));
  float reachPulseB = noise(vec2(time * 0.029 + 211.0, u_seed * 0.016));
  float poolAngleA = (noise(vec2(time * 0.034 + 241.0, u_seed * 0.01)) - 0.5) * 2.4;
  float poolAngleB = (noise(vec2(time * 0.041 + 277.0, u_seed * 0.018)) - 0.5) * 2.8;
  float poolA = hauntedLightPool(
    v_uv,
    lightCenterA,
    vec2(0.53, 0.42) + reachPulseA * vec2(0.1, 0.08),
    poolAngleA
  );
  float secondLightLife = smoothstep(
    0.57,
    0.76,
    noise(vec2(time * 0.085 + 23.0, u_seed * 0.014))
  );
  float poolB = hauntedLightPool(
    v_uv,
    lightCenterB,
    vec2(0.43, 0.51) + reachPulseB * vec2(0.09, 0.1),
    poolAngleB
  )
    * secondLightLife * 0.72;
  float localLight = clamp(poolA + poolB, 0.0, 1.0);
  float illuminatedHaze = (borderFog * 0.78 + denseEdge * 0.34)
    * localLight * (0.42 + movingLight * 0.58) * lightLevel;
  // Three independently drifting depth planes keep the motes small and stop
  // the field from reading as one fixed texture over the map.
  float dustFar = hauntedDustLayer(
    p, 30.0, time * 0.52, 17.0, 0.93, 0.042
  );
  float dustMid = hauntedDustLayer(
    p + vec2(0.19, 0.27), 20.0, time * 0.86, 47.0, 0.92, 0.05
  );
  float dustNear = hauntedDustLayer(
    p + vec2(0.07, 0.16), 13.0, time * 1.24, 79.0, 0.93, 0.06
  );
  float dust = dustFar * 0.42 + dustMid * 0.68 + dustNear * 0.92;
  float ambientDust = dust;
  float litDust = dust * (localLight * 0.26 + illuminatedHaze * 0.76) * lightLevel;

  float darkness = borderFog * 0.56 + denseEdge * 0.4;
  color = mix(vec3(0.018, 0.025, 0.045), vec3(0.46, 0.64, 0.61),
    clamp(illuminatedHaze * 1.24 + ambientDust * 0.96 + litDust, 0.0, 1.0));
  alpha = darkness + illuminatedHaze * 0.22 + ambientDust * 0.72 + litDust * 0.36;`,
});
