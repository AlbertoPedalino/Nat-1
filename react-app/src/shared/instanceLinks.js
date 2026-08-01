import { readRegistry, writeRegistry } from './localStorageRegistries.js';
import { emitStorageEvent } from './scopedStoragePayload.js';
import { SECTION_KEYS, SECTION_REGISTRY } from './sectionRegistry.js';
import { makeLinkGroupId, normalizeLinkGroupId } from './linkGroupId.js';

export { makeLinkGroupId, normalizeLinkGroupId };

export function readLocalToolInstances() {
  return SECTION_KEYS.flatMap((sectionKey) => {
    const section = SECTION_REGISTRY[sectionKey];
    return readRegistry(section.registryKey).map((entry) => ({
      ...entry,
      sectionKey,
      linkGroupId: normalizeLinkGroupId(entry.linkGroupId),
      origin: 'local',
      hasLocal: true,
    }));
  });
}

export function setLocalInstanceLink(sectionKey, id, linkGroupId, { emit = true } = {}) {
  const section = SECTION_REGISTRY[sectionKey];
  if (!section || !id) return null;
  const list = readRegistry(section.registryKey);
  const existing = list.find((entry) => entry.id === id);
  if (!existing) return null;
  const entry = {
    ...existing,
    linkGroupId: normalizeLinkGroupId(linkGroupId),
    updatedAt: Date.now(),
  };
  writeRegistry(section.registryKey, [entry, ...list.filter((item) => item.id !== id)]);
  if (emit) emitStorageEvent(section.saveEvent, id);
  try {
    window.dispatchEvent(new CustomEvent('gb:instance-links-changed', {
      detail: { sectionKey, id, linkGroupId: entry.linkGroupId },
    }));
  } catch (_) {}
  return entry;
}

export function mergeLinkedInstanceRows(sectionKey, cloudRows = [], localRows = []) {
  const localById = new Map(localRows.map((entry) => [entry.id, entry]));
  const rows = [];
  const seen = new Set();
  for (const cloud of cloudRows) {
    if (!cloud?.id || seen.has(cloud.id)) continue;
    const local = localById.get(cloud.id);
    rows.push({
      ...local,
      id: cloud.id,
      name: cloud.name || local?.name || cloud.id,
      sectionKey,
      linkGroupId: normalizeLinkGroupId(cloud.link_group_id ?? local?.linkGroupId),
      updatedAt: Date.parse(cloud.updated_at) || local?.updatedAt || 0,
      origin: 'cloud',
      hasLocal: Boolean(local),
    });
    seen.add(cloud.id);
  }
  for (const local of localRows) {
    if (!local?.id || seen.has(local.id)) continue;
    rows.push({
      ...local,
      sectionKey,
      linkGroupId: normalizeLinkGroupId(local.linkGroupId),
      origin: 'local',
      hasLocal: true,
    });
  }
  return rows;
}

export function linkedNewRoute(sectionKey, linkGroupId) {
  const section = SECTION_REGISTRY[sectionKey];
  const group = normalizeLinkGroupId(linkGroupId);
  if (!section || !group) return section?.newRoute || '/';
  const separator = section.newRoute.includes('?') ? '&' : '?';
  return `${section.newRoute}${separator}linkGroup=${encodeURIComponent(group)}`;
}

export function resolveGroupMerge(current, target, rows, idFactory = makeLinkGroupId) {
  const currentGroup = normalizeLinkGroupId(current?.linkGroupId);
  const targetGroup = normalizeLinkGroupId(target?.linkGroupId);
  const groupId = currentGroup || targetGroup || idFactory();
  const sourceGroups = new Set([currentGroup, targetGroup].filter(Boolean));
  const members = rows.filter((row) => (
    (row.sectionKey === current?.sectionKey && row.id === current?.id)
    || (row.sectionKey === target?.sectionKey && row.id === target?.id)
    || sourceGroups.has(normalizeLinkGroupId(row.linkGroupId))
  ));
  return {
    groupId,
    members,
    mergesGroups: Boolean(currentGroup && targetGroup && currentGroup !== targetGroup),
  };
}
