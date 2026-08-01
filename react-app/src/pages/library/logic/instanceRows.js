export function shouldPullCloudCopy(localUpdatedAt, cloudMeta) {
  if (!cloudMeta?.updated_at) return false;
  const cloudUpdatedAt = Date.parse(cloudMeta.updated_at);
  const localTime = Number(localUpdatedAt) || 0;
  return Number.isFinite(cloudUpdatedAt) && cloudUpdatedAt > localTime;
}

export function mergeInstanceRows(cloudRows = [], localEntries = []) {
  const localById = new Map(localEntries.filter((entry) => entry?.id).map((entry) => [entry.id, entry]));
  const rows = [];
  const seen = new Set();

  for (const cloud of cloudRows) {
    if (!cloud?.id || seen.has(cloud.id)) continue;
    const local = localById.get(cloud.id);
    rows.push({
      id: cloud.id,
      name: cloud.name || local?.name || cloud.id,
      updatedAt: Date.parse(cloud.updated_at) || local?.updatedAt || 0,
      localUpdatedAt: local?.updatedAt || 0,
      origin: 'cloud',
      hasLocal: Boolean(local),
      owner: cloud.owner ?? null,
      ownerUsername: cloud.owner_username || null,
    });
    seen.add(cloud.id);
  }

  for (const local of localEntries) {
    if (!local?.id || seen.has(local.id)) continue;
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

  rows.sort((left, right) => right.updatedAt - left.updatedAt);
  return rows;
}

export async function loadInstanceRows({ listCloud, listLocal, errorMessage = 'Failed to load cloud saves.' }) {
  const localEntries = (await listLocal()) || [];
  let cloudRows = [];
  let error = null;
  try {
    cloudRows = (await listCloud()) || [];
  } catch (cause) {
    error = cause?.message || errorMessage;
  }
  return { rows: mergeInstanceRows(cloudRows, localEntries), error };
}

export function sectionDeletePlan(row) {
  if (!row) return { cloud: false, local: false, confirmMessage: null };
  if (row.origin === 'local') {
    return {
      cloud: false,
      local: true,
      confirmMessage: `Delete "${row.name}"? This removes it from this device.`,
    };
  }
  return {
    cloud: true,
    local: true,
    confirmMessage: `Delete "${row.name}" from the cloud and this device? This cannot be undone.`,
  };
}
