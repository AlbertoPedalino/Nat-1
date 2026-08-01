const LINK_GROUP_PATTERN = /^[a-z0-9_-]{1,80}$/i;

export function normalizeLinkGroupId(value) {
  const id = String(value || '').trim();
  return LINK_GROUP_PATTERN.test(id) ? id : null;
}

export function makeLinkGroupId() {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid) return `link_${uuid}`;
  return `link_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}
