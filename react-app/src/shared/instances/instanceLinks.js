import { setInstanceLinkGroup } from './instanceStore.js';
import { makeLinkGroupId, normalizeLinkGroupId } from './linkGroupId.js';

export { makeLinkGroupId, normalizeLinkGroupId };

// Links (or unlinks, with null) a local instance. The change is local first
// and synced like any other edit; views that show links are told directly.
export function setLocalInstanceLink(sectionKey, id, linkGroupId) {
  const entry = setInstanceLinkGroup(sectionKey, id, linkGroupId);
  if (!entry) return null;
  try {
    window.dispatchEvent(new CustomEvent('gb:instance-links-changed', {
      detail: { sectionKey, id, linkGroupId: entry.linkGroupId },
    }));
  } catch (_) {}
  return entry;
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
