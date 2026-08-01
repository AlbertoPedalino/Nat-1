// Pure merge/delete-routing logic for the characters picker. No React, no
// network — inputs are plain arrays/objects so this is unit-testable in
// isolation.

// Merge cloud rows and local registry entries by id. A sheet present in both
// renders as one row: the cloud copy wins name + updatedAt, but we remember
// that a local copy also exists (needed for rename + delete cleanup).
export function mergeCharacterRows(cloudRows = [], localEntries = []) {
  const localById = new Map(localEntries.filter((e) => e && e.id).map((e) => [e.id, e]));
  const rows = [];
  const seen = new Set();

  for (const cloud of cloudRows) {
    if (!cloud || !cloud.id) continue;
    const local = localById.get(cloud.id);
    rows.push({
      id: cloud.id,
      name: cloud.name || local?.name || cloud.id,
      updatedAt: Date.parse(cloud.updated_at) || local?.updatedAt || 0,
      // Kept distinct from `updatedAt` (which is cloud-wins for display) so
      // the freshness check can compare cloud time against the LOCAL copy's
      // own time, not against itself.
      localUpdatedAt: local?.updatedAt || 0,
      origin: 'cloud',
      hasLocal: Boolean(local),
      owner: cloud.owner ?? null,
      ownerUsername: cloud.owner_username || null,
    });
    seen.add(cloud.id);
  }

  for (const local of localEntries) {
    if (!local || !local.id || seen.has(local.id)) continue;
    rows.push({
      id: local.id,
      name: local.name || local.id,
      updatedAt: local.updatedAt || 0,
      localUpdatedAt: local.updatedAt || 0,
      origin: 'local',
      hasLocal: true,
      owner: null,
      ownerUsername: null,
    });
  }

  rows.sort((a, b) => b.updatedAt - a.updatedAt);
  return rows;
}

// A non-GM may only ever act on their own rows; a GM may act on any row.
export function canDeleteRow(row, { myId, isGm }) {
  if (!row) return false;
  return row.origin === 'local' || row.owner === myId || Boolean(isGm);
}

// Delete is contextual to row origin/ownership:
// - local-only  -> local removal only
// - own cloud   -> cloud delete (own) + local cleanup
// - foreign cloud, GM only -> cloud delete (any), local storage untouched
export function deletePlanFor(row, { myId, isGm }) {
  if (!row) return { cloud: null, local: false, confirmMessage: null };

  if (row.origin === 'local') {
    return {
      cloud: null,
      local: true,
      confirmMessage: `Delete "${row.name}"? This removes it from this device.`,
    };
  }

  if (row.owner === myId) {
    return {
      cloud: 'own',
      local: true,
      confirmMessage: `Delete "${row.name}" from the cloud? This cannot be undone.`,
    };
  }

  if (isGm) {
    return {
      cloud: 'any',
      local: false,
      confirmMessage: `Delete "${row.name}", belonging to ${row.ownerUsername || 'another user'}? This cannot be undone.`,
    };
  }

  return { cloud: null, local: false, confirmMessage: null };
}

// Loads + merges rows. A failing cloud call never throws and never hides the
// local list: it just yields the local-only rows plus a non-blocking error.
export async function loadCharacterRows({ listCloud, listLocal }) {
  const localEntries = (await listLocal()) || [];
  let cloudRows = [];
  let error = null;
  try {
    cloudRows = (await listCloud()) || [];
  } catch (e) {
    error = e?.message || 'Failed to load cloud sheets.';
  }
  return { rows: mergeCharacterRows(cloudRows, localEntries), error };
}
