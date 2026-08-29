import { createAtmosphereFragmentShader } from './common.js';

const GOLD_VAULT_HELPERS = `
float vaultGlintLayer(vec2 uv, float scale, float time, float salt) {
  vec2 grid = uv * scale;
  vec2 cell = floor(grid);
  vec2 local = fract(grid) - 0.5;
  float identity = hash(cell + vec2(salt, salt * 0.43));
  vec2 center = vec2(
    hash(cell + vec2(salt + 5.4, 17.0)),
    hash(cell + vec2(29.0, salt + 2.3))
  ) - 0.5;
  float pulse = pow(max(0.0, sin(time * (0.7 + identity * 0.9) + identity * 18.0)), 18.0);
  float horizontal = 1.0 - smoothstep(0.012, 0.055, abs(local.y - center.y));
  float vertical = 1.0 - smoothstep(0.012, 0.055, abs(local.x - center.x));
  float reach = 1.0 - smoothstep(0.04, 0.34, length(local - center));
  float exists = step(0.91, hash(cell + vec2(43.0, salt + 11.0)));
  return max(horizontal, vertical) * reach * pulse * exists;
}`;

export default createAtmosphereFragmentShader({
  helpers: GOLD_VAULT_HELPERS,
  body: `
  vec2 reflected = p * vec2(1.7, 2.2);
  vec2 warp = vec2(
    fbm(reflected * 0.72 + vec2(time * 0.035, 3.0)),
    fbm(reflected * 0.65 - vec2(7.0, time * 0.028))
  );
  float lowerBounce = 1.0 - smoothstep(0.04, 0.92, v_uv.y);
  float sideBounce = 1.0 - smoothstep(0.08, 0.72, min(v_uv.x, 1.0 - v_uv.x));
  float broadGlow = lowerBounce * 0.52 + sideBounce * lowerBounce * 0.36;
  float causticA = pow(max(0.0, sin((p.x + warp.x * 0.48) * 19.0
    + v_uv.y * 7.0 - time * 0.9)), 10.0);
  float causticB = pow(max(0.0, sin((p.x - warp.y * 0.4) * 27.0
    - v_uv.y * 4.0 + time * 0.63)), 14.0);
  float reflectedLight = (causticA * 0.62 + causticB * 0.38)
    * (0.28 + lowerBounce * 0.72);
  float glints = vaultGlintLayer(v_uv, 7.0, time, 17.0)
    + vaultGlintLayer(v_uv + vec2(0.17, 0.29), 12.0, time * 0.86, 53.0) * 0.62;
  float dustGlow = smoothstep(0.72, 0.94, fbm(p * 3.4 + vec2(time * 0.025, 31.0)));
  dustGlow *= 0.35 + broadGlow;
  color = mix(vec3(0.32, 0.12, 0.015), vec3(0.96, 0.54, 0.07),
    clamp(broadGlow + reflectedLight, 0.0, 1.0));
  color = mix(color, vec3(1.0, 0.94, 0.54), clamp(glints + reflectedLight * 0.52, 0.0, 1.0));
  alpha = broadGlow * 0.23 + reflectedLight * 0.38 + glints * 0.82 + dustGlow * 0.12;`,
});
