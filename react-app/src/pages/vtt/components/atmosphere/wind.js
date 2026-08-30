import { createAtmosphereFragmentShader } from './common.js';

const WIND_HELPERS = `
float horizontalWindLines(
  vec2 p,
  float rows,
  float time,
  float velocity,
  float direction,
  float verticalVelocity,
  float salt
) {
  // The whole sparse row field drifts vertically. Opposing layers eventually
  // sweep every height without filling the viewport at the same instant.
  float rowPosition = (p.y + 0.5 + time * verticalVelocity) * rows;
  float row = floor(rowPosition);
  float identity = hash(vec2(row, salt));
  float verticalWave = sin(p.x * 3.2 + time * direction * 0.7 + identity * 6.2831853) * 0.16;
  verticalWave += sin(p.x * 7.1 - time * direction * 0.42 + salt) * 0.055;
  float across = abs(fract(rowPosition + verticalWave) - 0.5);
  float thickness = mix(0.045, 0.19, hash(vec2(row + 7.0, salt + 13.0)));
  float feather = mix(0.13, 0.22, identity);
  float core = 1.0 - smoothstep(thickness * 0.42, thickness + feather, across);

  float along = fract(p.x * 0.54 - time * velocity * direction + identity);
  float head = smoothstep(0.0, 0.075, along);
  float tail = 1.0 - smoothstep(0.38, 0.96, along);
  float alive = step(0.34, hash(vec2(row + 19.0, salt + 4.7)));
  return core * head * tail * alive;
}

float carriedFragment(
  vec2 p,
  float time,
  float direction,
  float salt,
  vec2 stretch,
  float threshold
) {
  // Give each horizontal band its own gust cycle. The dominant motion still
  // follows the wind, but a fragment can slow, veer and briefly curl back
  // instead of crossing the whole scene on one mechanically straight path.
  float band = floor((p.y + 0.5) * 10.5);
  float bandIdentity = hash(vec2(band + salt, salt * 0.73));
  float bandPhase = bandIdentity * 6.2831853;
  float identitySpeed = 0.58 + bandIdentity * 0.42;
  float shortGust = sin(time * (1.15 + bandIdentity * 0.75) + bandPhase) * 0.46;
  float longGust = sin(time * (0.34 + bandIdentity * 0.22) + bandPhase * 1.71) * 0.25;
  vec2 q = vec2(
    p.x * 6.8 - direction * (time * identitySpeed + shortGust + longGust),
    p.y * 10.5
  );
  vec2 cell = floor(q);
  vec2 local = fract(q) - 0.5;
  float identity = hash(cell + vec2(salt, salt * 0.43));
  float phase = identity * 6.2831853;
  vec2 randomCenter = vec2(
    hash(cell + vec2(salt + 7.3, 29.1)),
    hash(cell + vec2(41.7, salt + 12.4))
  ) - 0.5;
  // Keep the whole rotating silhouette inside its cell. The wider horizontal
  // allowance preserves an irregular distribution, while the tighter vertical
  // margin prevents lifted fragments from being clipped at a row boundary.
  local -= randomCenter * vec2(0.38, 0.28);
  float lift = sin(time * (1.35 + bandIdentity) + bandPhase + phase) * 0.07;
  lift += sin(time * 0.51 + bandPhase * 2.3) * 0.025;
  local.y -= lift;
  local.x -= cos(time * (0.76 + identity * 0.38) + phase) * 0.045;
  local = rotate2d(phase + time * direction * (1.9 + identity * 2.4)) * local;
  float silhouette = 1.0 - smoothstep(
    0.12,
    0.28,
    length(local * stretch)
  );
  float exists = step(threshold, hash(cell + vec2(salt + 31.0, 17.6)));
  return silhouette * exists;
}`;

export default createAtmosphereFragmentShader({
  helpers: WIND_HELPERS,
  body: `
  // Counter-flowing horizontal sheets enter from both sides. Different row
  // density, speed and phase keep them from reading as a uniform line pattern.
  float fromLeft = horizontalWindLines(p, 4.0, time, 0.42, 1.0, 0.052, 3.0);
  float fromRight = horizontalWindLines(p + vec2(1.7, 0.17), 6.0, time, 0.55, -1.0, -0.041, 11.0);
  float lines = fromLeft + fromRight * 0.9;

  // Broader translucent lanes make the strong airflow readable between the
  // brighter line cores without filling the scene like fog.
  float leftFlow = fbm(vec2(p.x * 1.35 - time * 0.82, p.y * 5.2 + 4.0));
  float rightFlow = fbm(vec2(p.x * 1.6 + time * 0.96, p.y * 6.1 + 17.0));
  float broadLeft = smoothstep(0.58, 0.82, leftFlow);
  float broadRight = smoothstep(0.6, 0.84, rightFlow);
  float pressure = pow(
    0.5 + 0.5 * sin(p.y * 15.0 + leftFlow * 5.0 - rightFlow * 3.0),
    7.0
  );

  float gustNoise = fbm(vec2(time * 0.14 + u_seed * 0.01, u_seed * 0.004 + 5.0));
  float gust = 0.82 + smoothstep(0.47, 0.72, gustNoise) * 0.58;
  // Separate grids, phases and directions prevent leaves from travelling as a
  // recognisable fixed cluster. The smaller ochre shards read as debris.
  float leavesLeft = carriedFragment(p, time, 1.0, 37.0, vec2(1.25, 3.1), 0.991);
  float leavesRight = carriedFragment(
    p + vec2(1.73, 0.38), time * 1.08, -1.0, 83.0, vec2(1.45, 3.5), 0.995
  );
  float leaves = max(leavesLeft, leavesRight);
  float debrisLeft = carriedFragment(
    p + vec2(2.9, 0.21), time * 1.14, 1.0, 61.0, vec2(3.7, 1.85), 0.989
  );
  float debrisRight = carriedFragment(
    p + vec2(0.63, 1.47), time * 0.91, -1.0, 109.0, vec2(4.3, 2.15), 0.994
  );
  float debris = max(debrisLeft, debrisRight);
  float bright = clamp(lines * 0.82 + pressure * 0.3, 0.0, 1.0);
  float shadow = clamp(broadRight * 0.38 + (1.0 - leftFlow) * 0.08, 0.0, 1.0);
  color = mix(vec3(0.1, 0.16, 0.2), vec3(0.82, 0.91, 0.93), bright);
  color = mix(color, vec3(0.055, 0.08, 0.11), shadow);
  color = mix(color, vec3(0.42, 0.57, 0.07), leaves);
  color = mix(color, vec3(0.72, 0.42, 0.12), debris);
  alpha = (lines * 0.72 + broadLeft * 0.16 + broadRight * 0.13 + pressure * 0.12) * gust;
  alpha += leaves * 0.94 + debris * 0.94;`,
});
