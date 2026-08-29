import { createAtmosphereFragmentShader } from './common.js';

const SUNRAY_HELPERS = `
float windowBeam(vec2 uv, vec2 direction, float width) {
  vec2 fromWindow = uv - vec2(0.12, 1.06);
  vec2 ray = normalize(direction);
  float distanceFromWindow = dot(fromWindow, ray);
  float distanceFromAxis = abs(dot(fromWindow, vec2(-ray.y, ray.x)));
  float coneWidth = width + max(0.0, distanceFromWindow) * 0.15;
  float cone = 1.0 - smoothstep(coneWidth * 0.48, coneWidth, distanceFromAxis);
  return cone * smoothstep(-0.025, 0.13, distanceFromWindow);
}

float dustMoteLayer(vec2 p, float scale, float time, float salt, float radius, float threshold) {
  vec2 grid = p * scale;
  vec2 cell = floor(grid);
  vec2 local = fract(grid) - 0.5;
  float identity = hash(cell + vec2(salt, salt * 0.37));
  float phase = identity * 6.2831853;
  vec2 restingOffset = vec2(
    hash(cell + vec2(salt + 3.1, 17.4)),
    hash(cell + vec2(29.7, salt + 8.2))
  ) - 0.5;
  restingOffset *= 0.18;
  vec2 floatingOffset = vec2(
    sin(time * (0.42 + identity * 0.3) + phase * 1.7) * 0.18,
    sin(time * (0.36 + identity * 0.38) + phase) * 0.27
  );
  float circle = 1.0 - smoothstep(radius * 0.52, radius, length(local - restingOffset - floatingOffset));
  float exists = step(threshold, hash(cell + vec2(salt + 41.0, 9.3)));
  return circle * exists;
}`;

export default createAtmosphereFragmentShader({
  helpers: SUNRAY_HELPERS,
  body: `
  float lean = sin(u_angle) * 0.22;
  float beamA = windowBeam(v_uv, vec2(0.3 + lean, -1.0), 0.026);
  float beamB = windowBeam(v_uv, vec2(0.68 + lean, -1.0), 0.034);
  float cloudTravel = time * 0.075 + u_seed * 0.019;
  float cloudA = fbm(vec2(cloudTravel, 2.4));
  float cloudB = fbm(vec2(cloudTravel + 0.43, 2.4));
  float openA = 0.04 + (1.0 - smoothstep(0.42, 0.65, cloudA)) * 0.96;
  float openB = 0.04 + (1.0 - smoothstep(0.42, 0.65, cloudB)) * 0.96;
  float airA = 0.72 + fbm(vec2(v_uv.y * 1.8, time * 0.055 + 4.0)) * 0.36;
  float airB = 0.72 + fbm(vec2(v_uv.y * 1.5, time * 0.047 + 11.0)) * 0.36;
  float shafts = clamp(beamA * openA * airA + beamB * openB * airB, 0.0, 1.0);
  float dustFine = dustMoteLayer(p, 24.0, time, 31.0, 0.105, 0.97);
  float dustNear = dustMoteLayer(p + 7.3, 13.0, time, 57.0, 0.12, 0.96);
  float dust = dustFine * 0.62 + dustNear;
  float illumination = smoothstep(0.06, 0.62, shafts);
  float ambientDust = dust * 0.43;
  float illuminatedDust = dust * illumination * 0.72;
  float haze = smoothstep(0.32, 0.8, fbm(p * 1.4 + vec2(time * 0.012, 4.0)));
  color = mix(vec3(0.68, 0.58, 0.43), vec3(1.0, 0.91, 0.56), clamp(illumination + illuminatedDust, 0.0, 1.0));
  float beamGlow = pow(shafts, 0.72);
  alpha = beamGlow * 0.56 + haze * 0.06 + ambientDust + illuminatedDust;`,
});
