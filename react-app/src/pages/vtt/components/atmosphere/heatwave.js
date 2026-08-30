import { createAtmosphereFragmentShader } from './common.js';

const HEAT_DUST_HELPERS = `
// Unlike the generic mote field, desert dust may occupy the whole area of a
// cell. Sampling the neighbouring cells lets grains cross their boundaries,
// removing the empty seams and regularly spaced rows left by a centred grid.
float heatDustHash(vec2 p) {
  p += vec2(mod(u_seed, 997.0) * 0.017, mod(u_seed, 991.0) * 0.011);
  vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float heatDustLayer(
  vec2 p,
  vec2 drift,
  float scale,
  float time,
  float salt,
  float radius,
  float threshold
) {
  vec2 grid = (p + drift * time * 0.0035) * scale;
  vec2 origin = floor(grid);
  vec2 local = fract(grid);
  float field = 0.0;

  // A grain belonging to an adjacent cell can overlap this fragment, so all
  // nine neighbours participate. Its resting point is uniform across the full
  // cell instead of being confined near the centre.
  for (int x = -1; x <= 1; x++) {
    for (int y = -1; y <= 1; y++) {
      vec2 neighbour = vec2(float(x), float(y));
      vec2 cell = origin + neighbour;
      float identity = heatDustHash(cell + vec2(salt, salt * 0.37));
      vec2 restingPoint = vec2(
        heatDustHash(cell * vec2(1.37, 0.73) + vec2(salt + 3.1, 17.4)),
        heatDustHash(cell.yx * vec2(1.61, 0.59) + vec2(29.7, salt + 8.2))
      );
      float phase = identity * 6.2831853;
      vec2 floatingOffset = vec2(
        sin(time * (0.42 + identity * 0.3) + phase * 1.7) * 0.07,
        sin(time * (0.36 + identity * 0.38) + phase) * 0.09
      );
      float sizeSeed = heatDustHash(cell * vec2(0.83, 1.49) + vec2(salt + 63.0, 51.9));
      float sizeVariation = 0.35 + sizeSeed * sizeSeed * 1.3;
      float moteRadius = min(radius * sizeVariation, 0.12);
      float circle = 1.0 - smoothstep(
        moteRadius * 0.3,
        moteRadius,
        length(neighbour + restingPoint + floatingOffset - local)
      );
      float exists = step(
        threshold,
        heatDustHash(cell * vec2(1.91, 0.67) + vec2(salt + 41.0, 9.3))
      );
      field = max(field, circle * exists * (0.6 + sizeVariation * 0.28));
    }
  }

  return field;
}`;

const HEAT_HELPERS = `
// One sheet of bending air. Sampling it at three phase offsets is what gives the
// colour split further down: refraction disperses light, and that fringing is the
// cue the eye trusts most when nothing underneath is actually being moved.
float heatSheet(vec2 p, vec2 uv, float time, float warp, float detail, float shift) {
  // Bands widen as they come closer, so the top of the frame reads as far away.
  float squeeze = 26.0 + uv.y * 14.0;
  float coarse = sin(uv.y * squeeze - time * 2.6 + (warp - 0.5) * 11.0 + p.x * 2.1 + shift);
  float fine = sin(uv.y * squeeze * 0.55 - time * 4.3 + (detail - 0.5) * 16.0 - p.x * 3.4 + shift * 1.7);
  return coarse * 0.62 + fine * 0.38;
}

// Hot ground does not shimmer evenly, it releases columns. Each one keeps its own
// width, sway and pulse so the wall of air breaks up instead of scrolling as one.
float thermalColumns(vec2 p, float time, float salt) {
  float x = p.x * 3.4 + salt;
  float column = floor(x);
  float local = fract(x) - 0.5;
  float identity = hash(vec2(column, salt));
  float width = 0.16 + identity * 0.3;
  float sway = sin(time * (0.4 + identity * 0.5) + identity * 6.2831853) * 0.16;
  float shaft = 1.0 - smoothstep(width * 0.5, width, abs(local - sway));
  float breathe = 0.45 + 0.55 * sin(time * (0.55 + identity * 0.6) + identity * 12.0);
  return shaft * breathe;
}

// A low sun photographed straight on: a small hard white core inside a wide warm
// halo, one broad diagonal ray laid across the whole frame, and a single ghost
// thrown through the centre. No aperture spokes and no anamorphic bar - those
// belong to cinema lenses, not to the eye or to a phone pointed at a desert.
vec3 sunGlow(vec2 uv, float aspect, float time, float seed) {
  vec2 sun = vec2(0.74, 0.88);
  vec2 offset = (uv - sun) * vec2(aspect, 1.0);
  float dist = length(offset);
  float seedPhase = mod(seed, 6.2831853);

  float core = pow(1.0 - smoothstep(0.0, 0.05, dist), 2.0);
  float halo = pow(1.0 - smoothstep(0.0, 0.46, dist), 2.4);

  // The ray is a band through the sun rather than a cone from it, so it runs off
  // both edges of the frame the way a real streak does.
  float streakSway = sin(mod(time, 78.5398) * 0.08 + seedPhase) * 0.065;
  vec2 ray = normalize(vec2(0.58 + streakSway, 1.0));
  float acrossRay = abs(dot(offset, vec2(-ray.y, ray.x)));
  float streak = pow(1.0 - smoothstep(0.0, 0.17, acrossRay), 1.6)
    * (0.32 + 0.68 * (1.0 - smoothstep(0.0, 1.15, dist)));

  // Crepuscular cones. Sampling the noise on the unit direction rather than on
  // the raw angle keeps the fan seamless where atan wraps at the back of the
  // circle, which would otherwise leave a hard edge running out of the sun.
  vec2 rayDirection = offset / max(dist, 0.001);
  // Two unrelated cycles move the fan across both axes while a third gently
  // changes its angle. This keeps the rays visibly alive without rotating the
  // whole fan around the sun like a spotlight.
  //
  // Each is wrapped at exactly its own period before being scaled, which leaves
  // the sine untouched while keeping the argument small. Feeding a raw u_time of
  // several thousand into a slow sine would quantise the phase into visible steps
  // at mediump, and into fbm it would destroy the noise outright.
  float fanPhaseA = mod(time, 34.9066) * 0.18;
  float fanPhaseB = mod(time, 75.7010) * 0.083;
  vec2 fanDrift = vec2(
    sin(fanPhaseA + seedPhase) * 1.9,
    cos(fanPhaseB + seedPhase * 0.73) * 1.55
  );
  float fanSway = sin(fanPhaseA + seedPhase * 0.41) * 0.13
    + sin(fanPhaseB * 2.0 + 1.7) * 0.055;
  vec2 movingDirection = rotate2d(fanSway) * rayDirection;
  float coarseFan = fbm(movingDirection * 3.6 + fanDrift);
  float fineFan = noise(movingDirection * 8.2 - fanDrift * 1.15);
  // A narrow smoothstep window is what makes a cone an edge rather than a smear:
  // the fan is a continuous noise field, and where it is cut decides whether the
  // rays have sides. Widen this back out and they dissolve into a warm blur.
  float cones = smoothstep(0.5, 0.6, coarseFan * 0.66 + fineFan * 0.44)
    * smoothstep(0.03, 0.19, dist)
    * (1.0 - smoothstep(0.28, 1.2, dist));

  vec2 ghostOffset = (uv - (vec2(1.0) - sun)) * vec2(aspect, 1.0);
  float ghost = pow(1.0 - smoothstep(0.0, 0.19, length(ghostOffset)), 2.6);

  // The sun itself stays steady. Pulsing the whole expression made the hard core
  // brighten and dim with the rays, which read as a flashing light.
  return vec3(1.0, 0.98, 0.94) * core
    + vec3(1.0, 0.71, 0.33) * halo * 0.62
    + vec3(1.0, 0.87, 0.64) * streak * 0.34
    + vec3(1.0, 0.84, 0.55) * cones * 0.52
    + vec3(1.0, 0.58, 0.30) * ghost * 0.22;
}`;

// The map is a sibling <img>, so this canvas can never bend its pixels. Overlay
// blending is the closest honest approximation: the bands lighten and darken the
// ground where they sit, and the eye reads that as air rippling over hot sand.
export default createAtmosphereFragmentShader({
  helpers: HEAT_DUST_HELPERS + HEAT_HELPERS,
  body: `
  // Haze thickens steadily with distance, the way air does over anything more
  // than a few hundred feet, and it keeps thickening all the way up.
  float distant = smoothstep(0.1, 0.72, v_uv.y);

  // The shimmer itself lives in a band rather than following that curve. Nearer
  // than this there is too little air in the way to bend anything; higher than
  // this you have left the ground and are looking at sky, which has nothing hot
  // underneath it to rise off.
  float heatBand = smoothstep(0.12, 0.44, v_uv.y) * (1.0 - smoothstep(0.5, 0.78, v_uv.y));

  float foreground = 1.0 - smoothstep(0.0, 0.42, v_uv.y);

  // Convection cells are wide and shallow, so the air reads as bending sideways
  // while it rises instead of curling upward like smoke.
  vec2 cell = vec2(p.x * 4.6 + wind.x * v_uv.y * 1.1, v_uv.y * 2.2 - time * 0.42);
  float warp = fbm(cell);
  float detail = fbm(cell * vec2(2.3, 1.4) + vec2(warp * 1.8, -time * 0.31));

  // Two column fields at different scales: one alone tiles too visibly.
  float columns = thermalColumns(p, time, 3.0) * 0.62
    + thermalColumns(p * 1.9 + 4.1, time * 1.35, 17.0) * 0.38;
  float strength = heatBand * (0.35 + columns * 0.95) * (0.5 + warp * 0.8);

  // Red bends least, blue most. Splitting the sheet across the channels puts a
  // faint warm/cool fringe on every band, the way heat haze does over a road.
  float sheetR = heatSheet(p, v_uv, time, warp, detail, -0.34) * strength;
  float sheetG = heatSheet(p, v_uv, time, warp, detail, 0.0) * strength;
  float sheetB = heatSheet(p, v_uv, time, warp, detail, 0.34) * strength;
  vec3 shimmer = vec3(sheetR, sheetG, sheetB);

  // The crest of each band blows out the way sun does on a bright surface.
  float crest = pow(max(0.0, sheetG), 3.0);

  // Airborne sand, in three depths so the air has thickness rather than one flat
  // sheet of specks. Each layer is blown by the scene wind at its own rate, and
  // the near one is coarsest since close grains are the only resolvable ones.
  //
  // Most of the sand is carried lit, with a thinner dark field under it. A grain
  // catching the sun reads bright and one seen against bright ground reads as
  // shadow, so both exist, but the lit ones are what the eye actually picks up:
  // they carry full opacity and mix to near-white, while the dark field only has
  // to keep the sand from disappearing over the pale parts of a desert map.
  // Each layer samples a grid turned to its own angle, so three fields cannot
  // line up into shared rows however different their scales are.
  //
  // The drift has to be turned by the same angle as the grid. Rotating p alone
  // leaves the wind pointing somewhere else once inside the rotated frame, and
  // each layer then blows its sand a different way - three parallel streams
  // crossing at wide angles, which is what reads as oblique lines rather than as
  // dust. Turning both keeps every layer travelling with the scene wind.
  //
  // The small angles added to the wind are deliberate: sand carried in real air
  // does not move in perfectly parallel tracks.
  float grainLit = heatDustLayer(
    rotate2d(0.41) * p, rotate2d(0.41) * rotate2d(0.09) * wind,
    17.0, time * 4.1, 23.0, 0.07, 0.914
  ) * (1.0 + foreground * 0.35);
  float grainFar = heatDustLayer(
    rotate2d(2.13) * p * 2.2 + 13.7, rotate2d(2.13) * rotate2d(-0.13) * wind,
    34.0, time * 1.7, 109.0, 0.04, 0.944
  );
  float grainShadow = heatDustLayer(
    rotate2d(1.27) * p * 1.5 + 6.4, rotate2d(1.27) * rotate2d(0.05) * wind,
    24.0, time * 2.8, 71.0, 0.052, 0.965
  );
  float grainBright = clamp(grainLit + grainFar * 0.7, 0.0, 1.0);
  float grainDark = clamp(grainShadow * 0.6, 0.0, 1.0);

  // The mirage: the bleached band where the ground stops resolving into detail.
  float mirage = heatBand * (0.55 + 0.45 * sin(p.x * 3.7 - time * 0.9 + warp * 5.0));

  vec3 glow = sunGlow(v_uv, aspect, time, u_seed * 0.31);
  float glowPeak = max(glow.r, max(glow.g, glow.b));

  // 0.5 is the neutral point of overlay, so the wash tints and the shimmer swings
  // around it in both directions. The scorch stays near neutral on purpose: a
  // bright wash here would blow the map out instead of warming it. It thickens
  // with distance, the way haze does over anything more than a few hundred feet.
  vec3 scorch = mix(vec3(0.44, 0.36, 0.27), vec3(0.72, 0.59, 0.40), distant);
  color = clamp(vec3(0.5) + shimmer * 0.5 + mirage * 0.16 + crest * 0.35, 0.0, 1.0);
  color = mix(color, scorch, 0.3);
  color = mix(color, vec3(1.0, 0.99, 0.94), grainBright);
  color = mix(color, vec3(0.26, 0.21, 0.15), grainDark * 0.7);
  color = clamp(color + glow * 0.55, 0.0, 1.0);
  alpha = distant * 0.26 + abs(sheetG) * 0.5 + mirage * 0.18 + crest * 0.3
    + grainBright * 0.95 + grainDark * 0.45 + glowPeak * 0.45;`,
});
