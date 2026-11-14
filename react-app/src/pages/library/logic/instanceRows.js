export function shouldPullCloudCopy(localUpdatedAt, cloudMeta) {
  if (!cloudMeta?.updated_at) return false;
  const cloudUpdatedAt = Date.parse(cloudMeta.updated_at);
  const localTime = Number(localUpdatedAt) || 0;
  return Number.isFinite(cloudUpdatedAt) && cloudUpdatedAt > localTime;
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
