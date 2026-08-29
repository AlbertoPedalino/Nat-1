// Atmosphere is scene state, but its animation is not. Every viewer receives this
// small description and renders the same seeded atmosphere locally; no frame or
// particle position ever crosses the wire.

export const ATMOSPHERE_TYPES = Object.freeze([
  'none', 'rain', 'storm', 'wind', 'fog', 'blizzard', 'sandstorm', 'snow', 'fire', 'sunrays',
  'swamp', 'haunted', 'goldvault',
]);

export const ATMOSPHERE_PRESETS = Object.freeze([
  { value: 'none', label: 'None' },
  { value: 'rain', label: 'Rain' },
  { value: 'storm', label: 'Thunderstorm' },
  { value: 'wind', label: 'Strong wind' },
  { value: 'fog', label: 'Rolling fog' },
  { value: 'snow', label: 'Snowfall' },
  { value: 'blizzard', label: 'Blizzard' },
  { value: 'sandstorm', label: 'Sandstorm' },
  { value: 'fire', label: 'Rising flames' },
  { value: 'sunrays', label: 'Sun rays & dust' },
  { value: 'swamp', label: 'Swamp' },
  { value: 'haunted', label: 'Haunted house' },
  { value: 'goldvault', label: 'Gold vault' },
]);

export const DEFAULT_ATMOSPHERE = Object.freeze({
  type: 'none',
  intensity: 0.65,
  direction: 12,
  speed: 1,
  seed: 1,
});

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function numberOr(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function normalizeAtmosphere(value) {
  const source = value && typeof value === 'object' ? value : {};
  return {
    type: ATMOSPHERE_TYPES.includes(source.type) ? source.type : DEFAULT_ATMOSPHERE.type,
    intensity: clamp(Math.round(numberOr(source.intensity, DEFAULT_ATMOSPHERE.intensity) * 20) / 20, 0.1, 1),
    direction: ((Math.round(numberOr(source.direction, DEFAULT_ATMOSPHERE.direction)) % 360) + 360) % 360,
    speed: clamp(Math.round(numberOr(source.speed, DEFAULT_ATMOSPHERE.speed) * 4) / 4, 0.25, 2),
    seed: clamp(Math.round(numberOr(source.seed, DEFAULT_ATMOSPHERE.seed)), 1, 999999),
  };
}
