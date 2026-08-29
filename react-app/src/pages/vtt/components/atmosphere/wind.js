import { createAtmosphereFragmentShader } from './common.js';

const WIND_HELPERS = `
float horizontalWindLines(
  vec2 p,
  float rows,
  float time,
  float velocity,
  float direction,
  float salt
) {
  float rowPosition = p.y * rows;
  float row = floor(rowPosition);
  float identity = hash(vec2(row, salt));
  float verticalWave = sin(p.x * 3.2 + time * direction * 0.7 + identity * 6.2831853) * 0.16;
  verticalWave += sin(p.x * 7.1 - time * direction * 0.42 + salt) * 0.055;
  float across = abs(fract(rowPosition + verticalWave) - 0.5);
  float core = 1.0 - smoothstep(0.045, 0.235, across);

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
  float identitySpeed = 0.72 + hash(vec2(salt, 8.3)) * 0.24;
  vec2 q = vec2(
    p.x * 6.8 - time * identitySpeed * direction,
    p.y * 10.5
  );
  vec2 cell = floor(q);
  vec2 local = fract(q) - 0.5;
  float identity = hash(cell + vec2(salt, salt * 0.43));
  float phase = identity * 6.2831853;
  local.y -= sin(time * (1.7 + identity) + phase) * 0.16;
  local.x -= cos(time * 0.83 + phase) * 0.055;
  local = rotate2d(phase + time * direction * (1.9 + identity * 2.4)) * local;
  float silhouette = 1.0 - smoothstep(
    0.14,
    0.235,
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
  float fromLeft = horizontalWindLines(p, 5.0, time, 0.42, 1.0, 3.0);
  float fromRight = horizontalWindLines(p + vec2(1.7, 0.17), 7.0, time, 0.55, -1.0, 11.0);
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
  float leaves = carriedFragment(p, time, 1.0, 37.0, vec2(1.25, 3.1), 0.975);
  float debris = carriedFragment(p + vec2(2.9, 0.21), time, -1.0, 61.0, vec2(2.5, 1.45), 0.983);
  float bright = clamp(lines * 0.82 + pressure * 0.3, 0.0, 1.0);
  float shadow = clamp(broadRight * 0.38 + (1.0 - leftFlow) * 0.08, 0.0, 1.0);
  color = mix(vec3(0.1, 0.16, 0.2), vec3(0.82, 0.91, 0.93), bright);
  color = mix(color, vec3(0.055, 0.08, 0.11), shadow);
  color = mix(color, vec3(0.24, 0.34, 0.08), leaves * 0.92);
  color = mix(color, vec3(0.3, 0.17, 0.065), debris * 0.94);
  alpha = (lines * 0.72 + broadLeft * 0.16 + broadRight * 0.13 + pressure * 0.12) * gust;
  alpha += leaves * 0.78 + debris * 0.72;`,
});
