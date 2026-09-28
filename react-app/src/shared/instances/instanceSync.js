import * as cloud from './instanceCloud.js';
import {
  CLOUD_STATES,
  announceSyncChange,
  createInstance,
  deleteLocalInstance,
  getInstance,
  hasInstancePayload,
  listInstances,
  readInstancePayload,
  replaceInstancePayload,
  subscribeInstances,
  updateInstance,
} from './instanceStore.js';
import { getSection, SECTION_KEYS } from './sectionRegistry.js';
import { normalizeLinkGroupId } from './linkGroupId.js';

// The sync engine of tool instances: the only code that talks to the cloud
// about them, and the only place that decides between INSERT, UPDATE, pull and
// conflict. Tools save locally (instanceStore.saveLocal); the store notifies
// this engine, which syncs in the background whenever the cloud is reachable.
//
//   local-only                 → INSERT (an existing row is a conflict)
//   linked, data dirty         → UPDATE if the row is still at our version,
//                                else conflict (or recreate a deleted row)
//   linked, only name/link     → metadata update, version untouched
//   linked, legacy, no version → adopt the row if it holds the same data,
//                                else conflict
//   conflict                   → nothing until resolveConflict()
//
// Nothing here blocks local use: offline, edits stay dirty and are flushed
// when the cloud is back (flushInstances).

let config = null;
let active = false;
let unsubscribe = null;
const timers = new Map();
const locks = new Map();
const syncing = new Set();
const availability = new Set();

const keyOf = (sectionKey, id) => `${sectionKey}:${id}`;

// Wired once by the app (CloudAutoSync): how to reach Supabase, the debounce,
// and where to report sync states.
export function configureInstanceSync({ getClient, delay = 1200, onStatus } = {}) {
  unsubscribe?.();
  config = { getClient, delay, onStatus };
  unsubscribe = subscribeInstances(({ sectionKey, id, kind }) => {
    if (kind === 'data' || kind === 'meta') scheduleSync(sectionKey, id);
    else if (kind === 'deleted') cancelSync(sectionKey, id);
  });
  announceAvailability();
  return disposeInstanceSync;
}

export function disposeInstanceSync() {
  unsubscribe?.();
  unsubscribe = null;
  for (const timer of timers.values()) clearTimeout(timer);
  timers.clear();
  config = null;
  announceAvailability();
}

// Signed in (and cloud configured) or not. Becoming reachable flushes every
// local change made meanwhile.
export function setInstanceSyncActive(next) {
  const was = isInstanceSyncOnline();
  active = Boolean(next);
  if (isInstanceSyncOnline() !== was) announceAvailability();
}

export function isInstanceSyncOnline() {
  return Boolean(config?.getClient && active);
}

export function subscribeInstanceSyncAvailability(listener) {
  availability.add(listener);
  return () => availability.delete(listener);
}

function announceAvailability() {
  for (const listener of [...availability]) {
    try { listener(); } catch (_) {}
  }
  if (isInstanceSyncOnline()) flushInstances();
}

function client() {
  if (!isInstanceSyncOnline()) throw new Error('Cloud sync is offline.');
  return config.getClient();
}

function report(id, state, message) {
  try { config?.onStatus?.(id, state, message); } catch (_) {}
}

// One sync or pull per instance at a time, in call order.
function withLock(key, run) {
  const previous = locks.get(key) || Promise.resolve();
  const next = previous.catch(() => {}).then(run);
  locks.set(key, next);
  next.finally(() => { if (locks.get(key) === next) locks.delete(key); }).catch(() => {});
  return next;
}

export function getSyncState(sectionKey, id) {
  if (syncing.has(keyOf(sectionKey, id))) return 'syncing';
  return getInstance(sectionKey, id)?.cloud || null;
}

function needsSync(sectionKey, entry) {
  if (!entry) return false;
  if (entry.cloud === CLOUD_STATES.CONFLICT) return false;
  if (entry.cloud === CLOUD_STATES.LOCAL) return hasInstancePayload(sectionKey, entry.id);
  return !entry.version || entry.dirty.data || entry.dirty.name || entry.dirty.linkGroup;
}

function scheduleSync(sectionKey, id, delay = config?.delay ?? 0) {
  if (!isInstanceSyncOnline()) return false;
  const key = keyOf(sectionKey, id);
  clearTimeout(timers.get(key));
  timers.set(key, setTimeout(() => {
    timers.delete(key);
    syncInstance(sectionKey, id).catch(() => {});
  }, delay));
  return true;
}

function cancelSync(sectionKey, id) {
  const key = keyOf(sectionKey, id);
  clearTimeout(timers.get(key));
  timers.delete(key);
}

// Syncs every instance with local changes the cloud lacks. Called when the
// cloud becomes reachable (sign-in, back online).
export function flushInstances() {
  if (!isInstanceSyncOnline()) return;
  for (const sectionKey of SECTION_KEYS) {
    for (const entry of listInstances(sectionKey)) {
      if (needsSync(sectionKey, entry)) scheduleSync(sectionKey, entry.id, 0);
    }
  }
}

function samePayload(left, right) {
  const canonical = (payload) => JSON.stringify(Object.entries(payload || {}).sort(([a], [b]) => a.localeCompare(b)));
  return canonical(left) === canonical(right);
}

function sameVersion(left, right) {
  return Boolean(left && right) && (left === right || Date.parse(left) === Date.parse(right));
}

// Records a successful write. `sent` says what the write carried: data (as of
// the entry's rev when the sync started), name, link group. What was not sent
// is adopted from the row unless it is dirty here; what changed locally while
// the write was in flight stays dirty and is synced next.
function settle(sectionKey, started, row, sent) {
  const entry = updateInstance(sectionKey, started.id, (current) => {
    const dirty = { ...current.dirty };
    let { name, linkGroupId } = current;
    if (sent.data) dirty.data = current.rev !== started.rev;
    if ('name' in sent) dirty.name = current.name !== sent.name;
    else if (!current.dirty.name && row.name) name = row.name;
    if ('link' in sent) dirty.linkGroup = normalizeLinkGroupId(current.linkGroupId) !== normalizeLinkGroupId(sent.link);
    else if (!current.dirty.linkGroup && row.link_group_id !== undefined) linkGroupId = normalizeLinkGroupId(row.link_group_id);
    return {
      ...current, name, linkGroupId, cloud: CLOUD_STATES.LINKED, version: row.updated_at, conflict: null, dirty,
    };
  });
  announceSyncChange(sectionKey, started.id);
  report(started.id, 'synced');
  if (needsSync(sectionKey, entry)) scheduleSync(sectionKey, started.id);
  return entry;
}

function markConflict(sectionKey, id, reason) {
  const entry = updateInstance(sectionKey, id, (current) => ({
    ...current, cloud: CLOUD_STATES.CONFLICT, conflict: { reason },
  }));
  announceSyncChange(sectionKey, id);
  report(id, 'conflict', reason === 'exists'
    ? 'This instance already exists in the cloud. Choose which copy to keep.'
    : 'This instance changed in the cloud. Choose which copy to keep.');
  return entry;
}

async function insertCopy(c, section, entry, payload) {
  const result = await cloud.insertRow(c, section, {
    id: entry.id,
    name: entry.name,
    link_group_id: entry.linkGroupId,
    data: payload,
    updated_at: cloud.nextVersion(null),
  });
  if (result.duplicate) return markConflict(section.key, entry.id, 'exists');
  return settle(section.key, entry, result.row, { data: true, name: entry.name, link: entry.linkGroupId });
}

async function pushData(c, section, entry, payload, retried = false) {
  const patch = { data: payload, updated_at: cloud.nextVersion(entry.version) };
  const sent = { data: true };
  if (entry.dirty.name) { patch.name = entry.name; sent.name = entry.name; }
  if (entry.dirty.linkGroup) { patch.link_group_id = entry.linkGroupId; sent.link = entry.linkGroupId; }
  const row = await cloud.updateData(c, section, entry.id, entry.version, patch);
  if (row) return settle(section.key, entry, row, sent);

  const meta = await cloud.fetchMeta(c, section, entry.id);
  // The row is gone (deleted elsewhere): this copy is the only one left.
  if (!meta) return insertCopy(c, section, entry, payload);
  // Another tab of this browser synced meanwhile: retry from its version.
  const latest = getInstance(section.key, entry.id);
  if (!retried && latest?.version && !sameVersion(latest.version, entry.version) && sameVersion(latest.version, meta.updated_at)) {
    return pushData(c, section, { ...latest, rev: entry.rev }, payload, true);
  }
  return markConflict(section.key, entry.id, 'version');
}

async function pushMeta(c, section, entry) {
  const patch = {};
  const sent = {};
  if (entry.dirty.name) { patch.name = entry.name; sent.name = entry.name; }
  if (entry.dirty.linkGroup) { patch.link_group_id = entry.linkGroupId; sent.link = entry.linkGroupId; }
  const row = await cloud.updateMeta(c, section, entry.id, patch);
  if (row) return settle(section.key, entry, row, sent);
  const payload = readInstancePayload(section.key, entry.id);
  return Object.keys(payload).length ? insertCopy(c, section, entry, payload) : entry;
}

// A linked entry from before versions existed: adopt the row only if it holds
// exactly this copy's data; otherwise nobody can tell which side is newer.
async function verifyLegacy(c, section, entry, payload) {
  const row = await cloud.fetchRow(c, section, entry.id);
  if (!row) return insertCopy(c, section, entry, payload);
  if (!samePayload(row.data, payload)) return markConflict(section.key, entry.id, 'unverified');
  return settle(section.key, entry, row, { data: true });
}

// Brings the cloud up to date with this copy, or records why it cannot.
export function syncInstance(sectionKey, id) {
  const section = getSection(sectionKey);
  if (!section || !id) return Promise.resolve(null);
  const key = keyOf(sectionKey, id);
  return withLock(key, async () => {
    const entry = getInstance(sectionKey, id);
    if (!needsSync(sectionKey, entry)) return entry;
    const c = client();
    const payload = readInstancePayload(sectionKey, id);
    syncing.add(key);
    announceSyncChange(sectionKey, id);
    report(id, 'syncing');
    try {
      if (entry.cloud === CLOUD_STATES.LOCAL) return await insertCopy(c, section, entry, payload);
      if (!entry.version) return await verifyLegacy(c, section, entry, payload);
      if (entry.dirty.data) return await pushData(c, section, entry, payload);
      return await pushMeta(c, section, entry);
    } catch (error) {
      report(id, 'error', String(error?.message || error));
      throw error;
    } finally {
      syncing.delete(key);
      announceSyncChange(sectionKey, id);
    }
  });
}

function pullLocked(sectionKey, id, row) {
  const section = getSection(sectionKey);
  const entry = replaceInstancePayload(sectionKey, id, row.data, (current) => ({
    name: current?.dirty.name ? current.name : (row.name || section.defaultName(id)),
    linkGroupId: current?.dirty.linkGroup ? current.linkGroupId : normalizeLinkGroupId(row.link_group_id),
    updatedAt: Date.parse(row.updated_at) || Date.now(),
    cloud: CLOUD_STATES.LINKED,
    version: row.updated_at,
    conflict: null,
    dirty: { data: false, name: Boolean(current?.dirty.name), linkGroup: Boolean(current?.dirty.linkGroup) },
  }));
  if (needsSync(sectionKey, entry)) scheduleSync(sectionKey, id);
  return entry;
}

// Replaces this copy's data with the cloud row. A rename or link change made
// here and not yet synced survives, and is sent next.
export function pullInstance(sectionKey, id) {
  const section = getSection(sectionKey);
  return withLock(keyOf(sectionKey, id), async () => {
    const row = await cloud.fetchRow(client(), section, id);
    if (!row?.data) throw new Error('No cloud data for this instance.');
    return pullLocked(sectionKey, id, row);
  });
}

// Opening an id. Returns what happened:
// - 'local': a local copy is used (known, or offline);
// - 'pulled': the id was unknown here and the cloud copy was pulled;
// - 'created': unknown here and absent from the cloud, created locally;
// - 'conflict': a local-only copy meets an existing cloud row;
// - 'unknown': the cloud could not be asked; a local copy is used, which can
//   only ever INSERT.
// A local copy never confirmed in the cloud is checked again whenever this
// runs online, so signing in later reconciles it.
export async function openInstance(sectionKey, id, { linkGroupId } = {}) {
  const section = getSection(sectionKey);
  const entry = getInstance(sectionKey, id);
  if (entry && entry.cloud !== CLOUD_STATES.LOCAL) return 'local';
  if (!isInstanceSyncOnline()) {
    if (!entry) createInstance(sectionKey, { id, linkGroupId, nameDirty: false });
    return 'local';
  }
  let meta;
  try {
    meta = await cloud.fetchMeta(client(), section, id);
  } catch {
    if (!entry) createInstance(sectionKey, { id, linkGroupId, nameDirty: false });
    return 'unknown';
  }
  if (meta) {
    if (entry && hasInstancePayload(sectionKey, id)) {
      markConflict(sectionKey, id, 'exists');
      return 'conflict';
    }
    try {
      await pullInstance(sectionKey, id);
      return 'pulled';
    } catch {
      if (!entry) createInstance(sectionKey, { id, linkGroupId, nameDirty: false });
      return 'unknown';
    }
  }
  if (entry) return 'local';
  createInstance(sectionKey, { id, linkGroupId, nameDirty: true });
  return 'created';
}

// A known linked copy, opened online: fast-forward it if the cloud moved on
// and nothing here is unsynced; if both changed, that is a conflict.
export async function refreshInstance(sectionKey, id) {
  const section = getSection(sectionKey);
  const entry = getInstance(sectionKey, id);
  if (!entry || entry.cloud !== CLOUD_STATES.LINKED || !isInstanceSyncOnline()) return 'local';
  let meta;
  try {
    meta = await cloud.fetchMeta(client(), section, id);
  } catch {
    return 'local';
  }
  if (!meta) return 'local';
  if (!entry.version || entry.dirty.data) {
    const synced = await syncInstance(sectionKey, id).catch(() => null);
    return synced?.cloud === CLOUD_STATES.CONFLICT ? 'conflict' : 'local';
  }
  if (!sameVersion(meta.updated_at, entry.version)) {
    await pullInstance(sectionKey, id);
    return 'pulled';
  }
  const adopted = updateInstance(sectionKey, id, (current) => {
    const name = current.dirty.name || !meta.name ? current.name : meta.name;
    const linkGroupId = current.dirty.linkGroup ? current.linkGroupId : normalizeLinkGroupId(meta.link_group_id);
    return name === current.name && linkGroupId === current.linkGroupId ? null : { ...current, name, linkGroupId };
  });
  if (adopted) announceSyncChange(sectionKey, id);
  return 'local';
}

// The user's choice for a conflicted copy: 'cloud' discards this copy's data
// for the cloud row; 'local' makes this copy the new cloud version, written
// against the version read now (if the row moves again, it conflicts again).
export async function resolveConflict(sectionKey, id, choice) {
  const section = getSection(sectionKey);
  const meta = await cloud.fetchMeta(client(), section, id);
  if (choice === 'cloud' && meta) return pullInstance(sectionKey, id);
  updateInstance(sectionKey, id, (current) => ({
    ...current,
    cloud: meta ? CLOUD_STATES.LINKED : CLOUD_STATES.LOCAL,
    version: meta ? meta.updated_at : null,
    conflict: null,
    dirty: { ...current.dirty, data: true },
  }));
  announceSyncChange(sectionKey, id);
  return syncInstance(sectionKey, id);
}

// Syncs now and fails unless the instance ends up as a cloud row (a campaign
// is about to reference it).
export async function ensureInstanceInCloud(sectionKey, id) {
  const section = getSection(sectionKey);
  await syncInstance(sectionKey, id);
  if (getInstance(sectionKey, id)?.cloud !== CLOUD_STATES.LINKED) {
    throw new Error(`Could not save the ${section?.label || 'tool'} to the cloud.`);
  }
}

// Rename or relink an instance that exists only in the cloud (picker, links).
export async function renameCloudInstance(sectionKey, id, nextName) {
  const name = String(nextName || '').trim();
  if (!name) throw new Error('The instance name cannot be empty.');
  const row = await cloud.updateMeta(client(), getSection(sectionKey), id, { name });
  if (!row) throw new Error('This instance is no longer in the cloud.');
  return name;
}

export async function linkCloudInstance(sectionKey, id, linkGroupId) {
  const row = await cloud.updateMeta(client(), getSection(sectionKey), id, { link_group_id: normalizeLinkGroupId(linkGroupId) });
  if (!row) throw new Error('This instance is no longer in the cloud.');
  return row;
}

// Waits for a sync in flight, so a finishing INSERT cannot recreate the row
// just deleted. The cloud row goes first: if that fails, the local copy stays.
export function deleteInstance(sectionKey, id, { cloud: fromCloud = false } = {}) {
  cancelSync(sectionKey, id);
  return withLock(keyOf(sectionKey, id), async () => {
    if (fromCloud) await cloud.deleteRow(client(), getSection(sectionKey), id);
    if (getInstance(sectionKey, id)) deleteLocalInstance(sectionKey, id);
  });
}

// Local and cloud instances of one tool as rows for pickers and link lists.
// A name or link group changed here and not yet synced wins over the cloud's.
export async function listToolInstances(sectionKey, { includeCloud = isInstanceSyncOnline() } = {}) {
  const section = getSection(sectionKey);
  const local = listInstances(sectionKey);
  let cloudRows = [];
  let error = null;
  if (includeCloud) {
    try {
      cloudRows = await cloud.listRows(client(), section);
    } catch (cause) {
      error = cause?.message || 'Failed to load cloud saves.';
    }
  }
  return { rows: mergeInstanceRows(sectionKey, cloudRows, local), error };
}

export function mergeInstanceRows(sectionKey, cloudRows = [], localEntries = []) {
  const localById = new Map(localEntries.map((entry) => [entry.id, entry]));
  const rows = [];
  const seen = new Set();
  for (const row of cloudRows) {
    if (!row?.id || seen.has(row.id)) continue;
    seen.add(row.id);
    const local = localById.get(row.id);
    rows.push({
      id: row.id,
      sectionKey,
      name: local?.dirty?.name ? local.name : (row.name || local?.name || row.id),
      updatedAt: Math.max(Date.parse(row.updated_at) || 0, local?.updatedAt || 0),
      linkGroupId: local?.dirty?.linkGroup ? local.linkGroupId : normalizeLinkGroupId(row.link_group_id),
      origin: 'cloud',
      hasLocal: Boolean(local),
      cloudState: local?.cloud || CLOUD_STATES.LINKED,
      owner: row.owner ?? null,
      ownerUsername: row.owner_username || null,
    });
  }
  for (const local of localEntries) {
    if (seen.has(local.id)) continue;
    rows.push({
      id: local.id,
      sectionKey,
      name: local.name || local.id,
      updatedAt: local.updatedAt || 0,
      linkGroupId: normalizeLinkGroupId(local.linkGroupId),
      origin: 'local',
      hasLocal: true,
      cloudState: local.cloud,
      owner: null,
      ownerUsername: null,
    });
  }
  return rows.sort((left, right) => right.updatedAt - left.updatedAt);
}
