import { createAtmosphereFragmentShader } from './common.js';

const SWAMP_HELPERS = `
float boilingBubbleLayer(vec2 uv, float columns, float time, float salt) {
  float column = floor(uv.x * columns);
  float identity = hash(vec2(column, salt));
  float cycle = fract(time * (0.08 + identity * 0.045) + identity * 7.3);
  float centerX = (column + 0.16 + hash(vec2(column + salt, 9.7)) * 0.68) / columns;
  centerX += sin(time * 1.1 + identity * 15.0) * 0.004;
  float centerY = 0.02 + cycle * 0.39;
  float radius = mix(0.006, 0.014, hash(vec2(column, salt + 21.0)));
  radius *= 0.72 + cycle * 0.58;
  float distanceToBubble = length((uv - vec2(centerX, centerY)) * vec2(1.0, 1.12));
  float rim = smoothstep(radius * 0.58, radius * 0.8, distanceToBubble)
    - smoothstep(radius * 0.82, radius * 1.16, distanceToBubble);
  float glint = 1.0 - smoothstep(
    radius * 0.12,
    radius * 0.38,
    length(uv - vec2(centerX - radius * 0.28, centerY + radius * 0.3))
  );
  float alive = smoothstep(0.025, 0.12, cycle) * (1.0 - smoothstep(0.76, 0.88, cycle));

  float popLife = smoothstep(0.78, 0.86, cycle) * (1.0 - smoothstep(0.86, 0.99, cycle));
  vec2 popDelta = uv - vec2(centerX, 0.345);
  float popDistance = length(popDelta);
  float popRadius = radius * (0.66 + max(0.0, cycle - 0.78) * 2.4);
  float pop = (smoothstep(popRadius * 0.58, popRadius * 0.82, popDistance)
    - smoothstep(popRadius * 0.84, popRadius * 1.18, popDistance)) * popLife;
  float exists = step(0.8, hash(vec2(column + 37.0, salt + 5.0)));
  return ((rim + glint * 0.72) * alive + pop * 0.92) * exists;
}

float swampSporeLayer(vec2 uv, float scale, float time, float salt) {
  vec2 grid = uv * scale;
  vec2 cell = floor(grid);
  vec2 local = fract(grid) - 0.5;
  float identity = hash(cell + vec2(salt, salt * 0.41));
  float phase = identity * 6.2831853;
  vec2 center = vec2(
    hash(cell + vec2(salt + 6.0, 13.0)),
    hash(cell + vec2(37.0, salt + 9.0))
  ) - 0.5;
  center *= 0.56;
  center += vec2(
    sin(time * (0.42 + identity * 0.28) + phase * 1.4) * 0.18,
    sin(time * (0.35 + identity * 0.24) + phase) * 0.24
  );
  float spore = 1.0 - smoothstep(0.054, 0.074, length(local - center));
  float exists = step(0.91, hash(cell + vec2(salt + 47.0, 5.0)));
  return spore * exists;
}

float swampFlyLayer(vec2 uv, float scale, float time, float salt) {
  vec2 grid = uv * vec2(scale, scale * 0.72);
  vec2 cell = floor(grid);
  vec2 local = fract(grid) - 0.5;
  float identity = hash(cell + vec2(salt, salt * 1.9));
  float phase = identity * 18.0;
  vec2 center = vec2(
    sin(time * (1.45 + identity * 0.8) + phase),
    sin(time * (1.9 + identity * 0.7) + phase * 1.37)
  ) * 0.27;
  center += vec2(
    sin(time * 3.2 + phase * 0.63),
    cos(time * 2.7 + phase * 0.81)
  ) * 0.055;
  vec2 flyDelta = local - center;
  float body = 1.0 - smoothstep(0.022, 0.038, length(flyDelta * vec2(0.78, 1.32)));
  float wingBeat = 0.45 + abs(sin(time * 18.0 + phase)) * 0.55;
  float wingA = 1.0 - smoothstep(0.022, 0.046, length(flyDelta - vec2(0.046, 0.016) * wingBeat));
  float wingB = 1.0 - smoothstep(0.022, 0.046, length(flyDelta + vec2(0.046, -0.016) * wingBeat));
  float visit = smoothstep(0.62, 0.88, 0.5 + 0.5 * sin(time * 0.34 + phase));
  float exists = step(0.84, hash(cell + vec2(29.0, salt + 17.0)));
  return max(body, max(wingA, wingB) * 0.48) * visit * exists;
}`;

export default createAtmosphereFragmentShader({
  helpers: SWAMP_HELPERS,
  body: `
  vec2 slowFlow = p * 1.38 + wind * time * 0.018;
  vec2 warp = vec2(
    fbm(slowFlow * 0.68 + vec2(time * 0.012, 7.4)),
    fbm(slowFlow * 0.61 - vec2(11.8, time * 0.01))
  );
  float murk = fbm(slowFlow + (warp - 0.5) * 2.5);
  float tendrils = fbm(p * vec2(2.8, 1.7) - wind * time * 0.026 + warp * 1.7);
  float lowMist = 1.0 - smoothstep(0.12, 0.9, v_uv.y + murk * 0.2);
  float hangingMist = smoothstep(0.42, 0.72, murk * 0.7 + tendrils * 0.42);
  float waterBand = (1.0 - smoothstep(0.08, 0.43, v_uv.y))
    * pow(0.5 + 0.5 * sin(p.x * 20.0 + warp.x * 9.0 - time * 1.65), 5.0);
  float boilingBody = smoothstep(0.48, 0.78,
    fbm(p * vec2(5.8, 3.1) + vec2(warp.x * 1.7, -time * 0.42)));
  boilingBody *= 1.0 - smoothstep(0.04, 0.42, v_uv.y);
  float bubbles = boilingBubbleLayer(v_uv, 5.0, time, 13.0);
  float spores = swampSporeLayer(v_uv, 19.0, time, 23.0) * 0.78
    + swampSporeLayer(v_uv + vec2(0.23, 0.11), 11.0, time * 0.86, 59.0) * 1.08;
  float flies = swampFlyLayer(v_uv, 5.0, time, 31.0)
    + swampFlyLayer(v_uv + vec2(0.12, 0.29), 7.0, time * 1.07, 73.0) * 0.72;
  float sicklyGlow = smoothstep(0.7, 0.94, fbm(p * 3.1 + vec2(time * 0.045, 23.0)));
  sicklyGlow *= 1.0 - smoothstep(0.35, 0.82, v_uv.y);
  color = mix(vec3(0.025, 0.105, 0.025), vec3(0.31, 0.63, 0.13), murk);
  color = mix(color, vec3(0.66, 0.94, 0.3), clamp(bubbles + spores * 1.02 + sicklyGlow * 0.62, 0.0, 1.0));
  color = mix(color, vec3(0.003, 0.007, 0.002), clamp(flies * 1.28, 0.0, 1.0));
  alpha = 0.09 + lowMist * 0.27 + hangingMist * 0.21 + waterBand * 0.18
    + boilingBody * 0.2 + bubbles * 0.68 + spores * 0.42 + flies * 0.9 + sicklyGlow * 0.16;`,
});
