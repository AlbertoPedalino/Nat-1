// A light filter on a scene picture: the same daylight map shown at dusk or at
// night without uploading a second painting. Each picture — the battlemap and
// every background — keeps its own, keyed by its storage path, so one uploaded
// twice can be the tavern by day and by night on the background strip.
//
// Only the picture is tinted. Tokens, drawings and the atmosphere stay as they
// are, so the table can still read them.
//
// Rendered as a CSS filter on the <img> plus one multiplied colour layer over
// it: both are composited on the GPU, so panning and zooming a large map stays
// smooth on a phone. An SVG colour matrix would be finer but is redrawn on the
// CPU at every frame.

export const IMAGE_FILTER_PRESETS = Object.freeze([
  { value: 'none', label: 'Daylight (as painted)' },
  { value: 'dawn', label: 'Dawn' },
  { value: 'afternoon', label: 'Late afternoon' },
  { value: 'sunset', label: 'Sunset' },
  { value: 'dusk', label: 'Dusk' },
  { value: 'night', label: 'Night' },
  { value: 'moonless', label: 'Moonless night' },
  { value: 'overcast', label: 'Overcast' },
  { value: 'torchlight', label: 'Torchlight' },
]);

// Each look at full intensity. `brightness`, `contrast` and `saturate` are CSS
// filter factors (1 = unchanged), `sepia` 0–1; `tint` is multiplied over the
// picture at `tintAlpha`.
const LOOKS = Object.freeze({
  dawn: { brightness: 0.92, contrast: 0.95, saturate: 0.85, sepia: 0, tint: '#f6b8c4', tintAlpha: 0.32 },
  afternoon: { brightness: 1, contrast: 1.04, saturate: 1.1, sepia: 0.12, tint: '#ffd08a', tintAlpha: 0.3 },
  sunset: { brightness: 0.88, contrast: 1.06, saturate: 1.2, sepia: 0.1, tint: '#ff8c52', tintAlpha: 0.42 },
  dusk: { brightness: 0.72, contrast: 1, saturate: 0.7, sepia: 0, tint: '#7a6ad0', tintAlpha: 0.48 },
  night: { brightness: 0.55, contrast: 1.08, saturate: 0.45, sepia: 0, tint: '#3a55a8', tintAlpha: 0.62 },
  moonless: { brightness: 0.34, contrast: 1.12, saturate: 0.3, sepia: 0, tint: '#1e2a55', tintAlpha: 0.7 },
  overcast: { brightness: 0.9, contrast: 0.92, saturate: 0.55, sepia: 0, tint: '#b9c4cf', tintAlpha: 0.3 },
  torchlight: { brightness: 0.62, contrast: 1.1, saturate: 0.9, sepia: 0.25, tint: '#ff9a45', tintAlpha: 0.45 },
});

export const IMAGE_FILTER_TYPES = Object.freeze(IMAGE_FILTER_PRESETS.map((preset) => preset.value));

export const DEFAULT_IMAGE_FILTER = Object.freeze({ type: 'none', intensity: 1 });

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export function normalizeImageFilter(value) {
  const source = value && typeof value === 'object' ? value : {};
  const type = IMAGE_FILTER_TYPES.includes(source.type) ? source.type : DEFAULT_IMAGE_FILTER.type;
  const parsed = Number(source.intensity);
  const intensity = Number.isFinite(parsed)
    ? clamp(Math.round(parsed * 20) / 20, 0.1, 1)
    : DEFAULT_IMAGE_FILTER.intensity;
  return { type, intensity };
}

// The stored map, `{ [storagePath]: { type, intensity } }`. A picture left as
// painted has no entry. With `paths`, entries for pictures no longer in the
// scene are dropped (a removed background, a replaced map).
export function normalizeImageFilters(value, paths = null) {
  const keep = Array.isArray(paths) ? new Set(paths.filter(Boolean)) : null;
  const result = {};
  if (!value || typeof value !== 'object' || Array.isArray(value)) return result;
  for (const [path, filter] of Object.entries(value)) {
    if (!path || (keep && !keep.has(path))) continue;
    const normalized = normalizeImageFilter(filter);
    if (normalized.type !== 'none') result[path] = normalized;
  }
  return result;
}

export function imageFilterFor(filters, path) {
  return normalizeImageFilter(path && filters ? filters[path] : null);
}

// `filters` with `path` set to `filter`, pruned to the scene's pictures.
export function withImageFilter(filters, path, filter, paths) {
  if (!path) return normalizeImageFilters(filters, paths);
  return normalizeImageFilters({ ...filters, [path]: filter }, paths);
}

const lerp = (from, to, amount) => from + (to - from) * amount;
const round = (value) => Math.round(value * 1000) / 1000;

// What the viewport applies: a CSS `filter` for the <img> and the colour layer
// laid over it, or nulls for a picture shown as painted.
export function imageFilterLook(value) {
  const { type, intensity } = normalizeImageFilter(value);
  const look = LOOKS[type];
  if (!look) return { filter: null, tint: null };
  const filter = [
    `brightness(${round(lerp(1, look.brightness, intensity))})`,
    `contrast(${round(lerp(1, look.contrast, intensity))})`,
    `saturate(${round(lerp(1, look.saturate, intensity))})`,
    look.sepia ? `sepia(${round(look.sepia * intensity)})` : null,
  ].filter(Boolean).join(' ');
  return {
    filter,
    tint: { color: look.tint, opacity: round(look.tintAlpha * intensity) },
  };
}
