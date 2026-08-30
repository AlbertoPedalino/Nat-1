import { createAtmosphereFragmentShader, DUST_MOTE_GLSL } from './common.js';

const SUNRAY_HELPERS = `
float windowBeam(vec2 uv, vec2 direction, float width) {
  vec2 fromWindow = uv - vec2(0.12, 1.06);
  vec2 ray = normalize(direction);
  float distanceFromWindow = dot(fromWindow, ray);
  float distanceFromAxis = abs(dot(fromWindow, vec2(-ray.y, ray.x)));
  float coneWidth = width + max(0.0, distanceFromWindow) * 0.15;
  float cone = 1.0 - smoothstep(coneWidth * 0.48, coneWidth, distanceFromAxis);
  return cone * smoothstep(-0.025, 0.13, distanceFromWindow);
}`;

export default createAtmosphereFragmentShader({
  helpers: DUST_MOTE_GLSL + SUNRAY_HELPERS,
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
  float dustFar = dustMoteLayer(p, moteDrift(31.0), 22.0, time * 0.48, 31.0, 0.085, 0.94);
  float dustMid = dustMoteLayer(
    p + 7.3, moteDrift(57.0), 15.5, time * 0.86, 57.0, 0.088, 0.94
  );
  float dustNear = dustMoteLayer(
    p + vec2(3.7, 11.2), moteDrift(89.0), 11.0, time * 1.28, 89.0, 0.08, 0.95
  );
  float dust = dustFar * 0.38 + dustMid * 0.64 + dustNear * 0.88;
  float illumination = smoothstep(0.06, 0.62, shafts);
  float ambientDust = dust * 0.43;
  float illuminatedDust = dust * illumination * 0.72;
  float haze = smoothstep(0.32, 0.8, fbm(p * 1.4 + vec2(time * 0.012, 4.0)));
  color = mix(vec3(0.68, 0.58, 0.43), vec3(1.0, 0.91, 0.56), clamp(illumination + illuminatedDust, 0.0, 1.0));
  float beamGlow = pow(shafts, 0.72);
  alpha = beamGlow * 0.56 + haze * 0.06 + ambientDust + illuminatedDust;`,
});
