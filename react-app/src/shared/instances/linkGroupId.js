import { makeId } from '../ids.js';
const LINK_GROUP_PATTERN = /^[a-z0-9_-]{1,80}$/i;

export function normalizeLinkGroupId(value) {
  const id = String(value || '').trim();
  return LINK_GROUP_PATTERN.test(id) ? id : null;
}

export function makeLinkGroupId() {
  return makeId('link');
}
