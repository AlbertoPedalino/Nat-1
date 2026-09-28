import { getSection, makeInstanceId } from './sectionRegistry.js';
import { normalizeLinkGroupId } from './linkGroupId.js';

// The local repository of GM Board, Encounter Builder and DM Screen instances.
//
// localStorage holds, per tool, one registry (the metadata of every instance)
// and each instance's payload as raw strings under `scopedPrefix(id)`. The
// payload is the unit the cloud stores; its keys and values are written by the
// tool's adapter and never interpreted here.
//
// Registry entry:
//   { id, name, updatedAt, linkGroupId,
//     cloud: 'local-only' | 'linked' | 'conflict',
//     version,   // cloud row `version` this copy is based on (linked only)
//     conflict,  // { reason } while cloud === 'conflict'
//     dirty: { data, name, linkGroup },  // local changes the cloud lacks
//     rev }      // local data revision, so a sync knows what it covered
//
// - local-only: never confirmed as a cloud row; its first sync can only INSERT.
// - linked: this copy is the cloud row at `version` (the database's integer
//   revision); data updates are conditional on it. A linked entry without a
//   valid version (older formats, including timestamp versions) is verified
//   against the cloud data before any write.
// - conflict: the cloud row and this copy diverged; nothing is written until
//   the user chooses a side (instanceSync.resolveConflict).
//
// Every write goes through here, so no instance can have data without an
// entry: unlisted data is registered again on read (see listInstances).

export const CLOUD_STATES = Object.freeze({ LOCAL: 'local-only', LINKED: 'linked', CONFLICT: 'conflict' });

const listeners = new Set();

// In-process change feed: the sync engine and open tool views listen here.
// Other tabs see the same writes through the browser's `storage` event.
export function subscribeInstances(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// Local data changes of one tool's instances (one instance if `id` is given):
// saves from this tab, including ones made by other features (the battle map
// writing fights), and pulls from the cloud.
export function subscribeInstanceData(sectionKey, id, listener) {
  return subscribeInstances((event) => {
    if (event.sectionKey !== sectionKey || (id && event.id !== id)) return;
    if (event.kind === 'data' || event.kind === 'pulled') listener(event);
  });
}

function notify(sectionKey, id, kind) {
  for (const listener of [...listeners]) {
    try { listener({ sectionKey, id, kind }); } catch (_) {}
  }
}

function requireSection(sectionKey) {
  const section = getSection(sectionKey);
  if (!section) throw new Error(`Unknown tool section: ${sectionKey}`);
  return section;
}

function cleanDirty(dirty) {
  return { data: Boolean(dirty?.data), name: Boolean(dirty?.name), linkGroup: Boolean(dirty?.linkGroup) };
}

// Current entries are kept as they are; the pre-refactor shape (flags
// `pendingInsert`, `namePending`, `linkGroupPending`, no cloud state) maps
// deterministically onto the new one.
export function normalizeEntry(section, raw) {
  if (!raw || typeof raw !== 'object' || !raw.id) return null;
  const legacy = !Object.values(CLOUD_STATES).includes(raw.cloud);
  const cloud = legacy ? (raw.pendingInsert ? CLOUD_STATES.LOCAL : CLOUD_STATES.LINKED) : raw.cloud;
  const dirty = legacy
    ? { data: Boolean(raw.pendingInsert), name: Boolean(raw.namePending), linkGroup: Boolean(raw.linkGroupPending) }
    : cleanDirty(raw.dirty);
  return {
    id: String(raw.id),
    name: String(raw.name || '').trim() || section.defaultName(raw.id),
    updatedAt: Number(raw.updatedAt) || 0,
    linkGroupId: normalizeLinkGroupId(raw.linkGroupId),
    cloud,
    version: cloud !== CLOUD_STATES.LOCAL && Number.isSafeInteger(raw.version) && raw.version >= 0 ? raw.version : null,
    conflict: cloud === CLOUD_STATES.CONFLICT ? { reason: raw.conflict?.reason || 'version' } : null,
    dirty,
    rev: Number(raw.rev) || 0,
  };
}

function readRaw(section) {
  try {
    const parsed = JSON.parse(localStorage.getItem(section.registryKey) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeEntries(section, entries) {
  localStorage.setItem(section.registryKey, JSON.stringify(entries));
}

function storedIds(section) {
  const prefix = section.keyPrefix;
  const ids = new Set();
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (typeof key !== 'string' || !key.startsWith(prefix)) continue;
    const id = key.slice(prefix.length).split(':')[0];
    if (id) ids.add(id);
  }
  return ids;
}

// Every instance of a tool, newest first. Normalizes legacy entries and lists
// again any instance whose data is stored but whose entry is missing (the old
// 20-entry cap dropped entries without their data). Such a copy was never
// confirmed as a cloud row, so it comes back local-only: it may create a row,
// never overwrite one. The normalized registry is written back once.
export function listInstances(sectionKey) {
  const section = requireSection(sectionKey);
  const raw = readRaw(section);
  const entries = [];
  const seen = new Set();
  for (const item of raw) {
    const entry = normalizeEntry(section, item);
    if (!entry || seen.has(entry.id)) continue;
    seen.add(entry.id);
    entries.push(entry);
  }
  for (const id of storedIds(section)) {
    if (seen.has(id)) continue;
    seen.add(id);
    entries.push(normalizeEntry(section, {
      id, cloud: CLOUD_STATES.LOCAL, dirty: { data: true }, updatedAt: Date.now(),
    }));
  }
  if (JSON.stringify(raw) !== JSON.stringify(entries)) {
    try { writeEntries(section, entries); } catch (_) {}
  }
  return entries.sort((left, right) => right.updatedAt - left.updatedAt);
}

export function getInstance(sectionKey, id) {
  if (!id) return null;
  return listInstances(sectionKey).find((entry) => entry.id === id) || null;
}

// Read-modify-write of one entry. `update` returns the next entry (or null to
// leave it). Returns the stored entry.
export function updateInstance(sectionKey, id, update) {
  const section = requireSection(sectionKey);
  const entries = listInstances(sectionKey);
  const index = entries.findIndex((entry) => entry.id === id);
  if (index < 0) return null;
  const next = update(entries[index]);
  if (!next) return entries[index];
  entries[index] = normalizeEntry(section, next);
  writeEntries(section, entries);
  return entries[index];
}

function addEntry(sectionKey, entry) {
  const section = requireSection(sectionKey);
  const entries = listInstances(sectionKey).filter((item) => item.id !== entry.id);
  const stored = normalizeEntry(section, entry);
  writeEntries(section, [stored, ...entries]);
  return stored;
}

// A new local-only instance. `nameDirty`: the name is this copy's own (a
// minted id, or one the cloud was asked about and lacks); an id that may exist
// elsewhere keeps its name clean so a cloud row found later keeps its own.
export function createInstance(sectionKey, { id, name, linkGroupId, nameDirty = true } = {}) {
  const section = requireSection(sectionKey);
  const instanceId = id || makeInstanceId(sectionKey);
  const existing = getInstance(sectionKey, instanceId);
  if (existing) return existing;
  const previous = localStorage.getItem(section.registryKey);
  try {
    const entry = addEntry(sectionKey, {
      id: instanceId,
      name: String(name || '').trim() || section.defaultName(instanceId),
      updatedAt: Date.now(),
      linkGroupId,
      cloud: CLOUD_STATES.LOCAL,
      dirty: { data: false, name: Boolean(nameDirty), linkGroup: false },
    });
    setActiveInstance(sectionKey, instanceId);
    notify(sectionKey, instanceId, 'meta');
    return entry;
  } catch {
    // Quota/denied: leave no half-created instance behind.
    try {
      if (previous == null) localStorage.removeItem(section.registryKey);
      else localStorage.setItem(section.registryKey, previous);
    } catch (_) {}
    return null;
  }
}

export function setActiveInstance(sectionKey, id) {
  const section = requireSection(sectionKey);
  try { localStorage.setItem(section.activeKey, id); } catch (_) {}
}

export function getActiveInstanceId(sectionKey) {
  const section = requireSection(sectionKey);
  try { return localStorage.getItem(section.activeKey) || ''; } catch { return ''; }
}

export function readInstanceValue(sectionKey, id, subKey) {
  const section = requireSection(sectionKey);
  try { return localStorage.getItem(section.scopedPrefix(id) + subKey); } catch { return null; }
}

export function readInstancePayload(sectionKey, id) {
  const section = requireSection(sectionKey);
  const prefix = section.scopedPrefix(id);
  const payload = {};
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (typeof key === 'string' && key.startsWith(prefix)) payload[key] = localStorage.getItem(key);
  }
  return payload;
}

export function hasInstancePayload(sectionKey, id) {
  return Object.keys(readInstancePayload(sectionKey, id)).length > 0;
}

// The one local write path. `values` maps payload sub-keys to raw strings (null
// removes the key). Unchanged values are not written; if nothing changed this
// is not a save: no dirty mark, no notification, no sync. A write for an id
// without an entry registers it (local-only). All-or-nothing: a failed write
// restores what it had replaced, then throws.
export function saveLocal(sectionKey, id, values) {
  const section = requireSection(sectionKey);
  if (!id) return false;
  const prefix = section.scopedPrefix(id);
  const changed = Object.entries(values || {}).filter(([subKey, raw]) => (
    localStorage.getItem(prefix + subKey) !== (raw ?? null)
  ));
  if (!changed.length) return false;
  const previous = changed.map(([subKey]) => [prefix + subKey, localStorage.getItem(prefix + subKey)]);
  try {
    for (const [subKey, raw] of changed) {
      if (raw == null) localStorage.removeItem(prefix + subKey);
      else localStorage.setItem(prefix + subKey, raw);
    }
    const now = Date.now();
    const touched = updateInstance(sectionKey, id, (entry) => ({
      ...entry, updatedAt: now, rev: entry.rev + 1, dirty: { ...entry.dirty, data: true },
    }));
    // listInstances registered it from its data if it had no entry.
    if (!touched) throw new Error('Could not register this instance.');
  } catch (error) {
    for (const [key, raw] of previous) {
      try {
        if (raw == null) localStorage.removeItem(key);
        else localStorage.setItem(key, raw);
      } catch (_) {}
    }
    throw error;
  }
  notify(sectionKey, id, 'data');
  return true;
}

export function renameInstance(sectionKey, id, nextName) {
  const name = String(nextName || '').trim();
  if (!name) return null;
  const entry = updateInstance(sectionKey, id, (current) => (current.name === name ? null : {
    ...current, name, updatedAt: Date.now(), dirty: { ...current.dirty, name: true },
  }));
  if (entry) notify(sectionKey, id, 'meta');
  return entry;
}

export function setInstanceLinkGroup(sectionKey, id, linkGroupId) {
  const group = normalizeLinkGroupId(linkGroupId);
  const entry = updateInstance(sectionKey, id, (current) => ({
    ...current, linkGroupId: group, updatedAt: Date.now(), dirty: { ...current.dirty, linkGroup: true },
  }));
  if (entry) notify(sectionKey, id, 'meta');
  return entry;
}

// Replaces the payload with the cloud's and records what the sync engine
// settled about the entry. Used by pulls only.
export function replaceInstancePayload(sectionKey, id, payload, entryPatch) {
  const section = requireSection(sectionKey);
  const prefix = section.scopedPrefix(id);
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)
    || Object.entries(payload).some(([key, value]) => !key.startsWith(prefix) || typeof value !== 'string')) {
    throw new Error('Invalid cloud instance payload.');
  }
  for (const key of Object.keys(readInstancePayload(sectionKey, id))) localStorage.removeItem(key);
  for (const [key, value] of Object.entries(payload)) localStorage.setItem(key, value);
  const exists = getInstance(sectionKey, id);
  const entry = exists
    ? updateInstance(sectionKey, id, (current) => ({ ...current, ...entryPatch(current), rev: current.rev + 1 }))
    : addEntry(sectionKey, { id, ...entryPatch(null), rev: 1 });
  notify(sectionKey, id, 'pulled');
  return entry;
}

// Called by the sync engine when an entry's cloud state changed.
export function announceSyncChange(sectionKey, id) {
  notify(sectionKey, id, 'sync');
}

export function deleteLocalInstance(sectionKey, id) {
  const section = requireSection(sectionKey);
  for (const key of Object.keys(readInstancePayload(sectionKey, id))) localStorage.removeItem(key);
  writeEntries(section, listInstances(sectionKey).filter((entry) => entry.id !== id));
  if (getActiveInstanceId(sectionKey) === id) {
    try { localStorage.removeItem(section.activeKey); } catch (_) {}
  }
  notify(sectionKey, id, 'deleted');
}
