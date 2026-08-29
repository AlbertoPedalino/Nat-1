import { clampZoom, normalizeView } from './geometry.js';

const SOURCE_RE = /^[a-z0-9_-]{8,80}$/i;
export const CAMERA_SOURCE_STORAGE_KEY = 'gb:vtt:presenter-source:v1';

export function normalizeCameraSource(value) {
  const source = String(value || '').trim();
  return SOURCE_RE.test(source) ? source : null;
}

export function createCameraSourceId() {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid) return uuid;
  return `camera-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function sessionCameraSource(storage) {
  try {
    const target = storage || globalThis.sessionStorage;
    const stored = normalizeCameraSource(target?.getItem?.(CAMERA_SOURCE_STORAGE_KEY));
    if (stored) return stored;
    const created = createCameraSourceId();
    target?.setItem?.(CAMERA_SOURCE_STORAGE_KEY, created);
    return created;
  } catch (_) {
    return createCameraSourceId();
  }
}

export function normalizeCameraPose(value) {
  const coordinates = value ? [value.centerX, value.centerY, value.zoom] : [];
  if (coordinates.length !== 3
    || coordinates.some((entry) => entry === null || entry === '' || !Number.isFinite(Number(entry)))) return null;
  return {
    centerX: Number(value.centerX),
    centerY: Number(value.centerY),
    zoom: clampZoom(value.zoom),
  };
}

export function viewToCameraPose(view, viewport) {
  const safeView = normalizeView(view);
  const width = Number(viewport?.width);
  const height = Number(viewport?.height);
  if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(height) || height <= 0) return null;
  return {
    centerX: (width / 2 - safeView.x) / safeView.zoom,
    centerY: (height / 2 - safeView.y) / safeView.zoom,
    zoom: safeView.zoom,
  };
}

export function cameraPoseToView(pose, viewport) {
  const safePose = normalizeCameraPose(pose);
  const width = Number(viewport?.width);
  const height = Number(viewport?.height);
  if (!safePose || !Number.isFinite(width) || width <= 0
    || !Number.isFinite(height) || height <= 0) return null;
  return {
    x: width / 2 - safePose.centerX * safePose.zoom,
    y: height / 2 - safePose.centerY * safePose.zoom,
    zoom: safePose.zoom,
  };
}

export function cameraMessage(source, pose) {
  const safeSource = normalizeCameraSource(source);
  const safePose = normalizeCameraPose(pose);
  return safeSource && safePose ? { source: safeSource, pose: safePose } : null;
}

export function presenterStateMessage(source, state) {
  const safeSource = normalizeCameraSource(source);
  const shownImage = state?.shownImage === 'background' ? 'background'
    : state?.shownImage === 'map' ? 'map' : null;
  if (!safeSource || typeof state?.following !== 'boolean' || !shownImage) return null;
  return {
    source: safeSource,
    following: state.following,
    shownImage,
    pose: normalizeCameraPose(state.pose),
  };
}

// What the presenter is pointing at is transient, just like the camera. Keeping
// it out of the scene row means a hover never becomes saved campaign state, but
// the source id still prevents one GM tab from driving another tab's projector.
export function presenterInspectionMessage(source, inspection) {
  const safeSource = normalizeCameraSource(source);
  if (!safeSource) return null;
  const isSerializedClear = inspection?.tokenId === null && inspection?.conditionKey === null;
  if (inspection == null || isSerializedClear) {
    return { source: safeSource, tokenId: null, conditionKey: null };
  }

  const tokenId = String(inspection.tokenId || '').trim();
  const conditionKey = inspection.conditionKey == null
    ? null
    : String(inspection.conditionKey).trim().toLowerCase();
  if (!tokenId || tokenId.length > 128) return null;
  if (conditionKey !== null && !/^[a-z0-9_-]{1,80}$/.test(conditionKey)) return null;
  return { source: safeSource, tokenId, conditionKey };
}
