// The last autosync state of each id (CloudAutoSync): 'scheduled' (a push is
// waiting for the debounce), 'syncing' (in flight), 'synced', 'error',
// 'conflict' (the cloud sheet moved on; nothing was written), or none. Lets an
// open sheet know, without polling, whether a push of it is still coming.

export const CLOUD_SYNC_EVENT = 'gb:cloud-sync';

const states = new Map();

export function setCloudSyncState(id, state) {
  if (!id) return;
  if (!state || state === 'cancelled') states.delete(String(id));
  else states.set(String(id), state);
}

export function cloudSyncState(id) {
  return states.get(String(id)) || null;
}

export function isCloudSyncBusy(id) {
  const state = cloudSyncState(id);
  return state === 'scheduled' || state === 'syncing';
}

// Record a state and announce it (CLOUD_SYNC_EVENT). Used by CloudAutoSync for
// every push, and by an explicit upload that met a conflict, so an open sheet
// offers the same choice either way.
export function reportCloudSyncState(id, state, message) {
  setCloudSyncState(id, state);
  try {
    window.dispatchEvent(new CustomEvent(CLOUD_SYNC_EVENT, { detail: { id, state, error: message } }));
  } catch (_) {}
}
