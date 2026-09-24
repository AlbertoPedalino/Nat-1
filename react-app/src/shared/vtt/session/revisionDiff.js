// Light recovery for a live scene: compare the ids and versions the database
// reports with what this client holds, and name only the rows worth fetching.
//
// Versions are whatever the table has — `updated_at` for scenes, pieces and
// fights, `row_revision` for sheets, nothing at all for strokes (ids only).

// Past this many changed rows one full read is cheaper and simpler than a long
// `id=in.(…)` list.
export const MAX_TARGETED_IDS = 50;

// `remote`: [{ id, version }] in the order the table lists them.
// `held`:   Map id -> version this client already has (undefined = unknown).
// `isStale(remoteVersion, heldVersion)` decides whether a held row is older.
export function diffRevisions(remote, held, isStale = (theirs, ours) => theirs !== ours) {
  const ids = [];
  const changed = [];
  const seen = new Set();
  for (const entry of remote || []) {
    const id = entry?.id;
    if (!id || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
    if (!held.has(id) || isStale(entry.version, held.get(id))) changed.push(id);
  }
  const removed = [...held.keys()].filter((id) => !seen.has(id));
  return { ids, changed, removed, clean: !changed.length && !removed.length };
}

// A sheet only needs re-reading when the database has a later revision; a held
// row that is already newer (a realtime event beat the check) is kept.
export function isOlderRevision(theirs, ours) {
  return Number(theirs ?? 0) > Number(ours ?? -1);
}

// Strokes carry no version: any id we hold is current.
export const idsOnly = () => false;

// The list in the database's order: fetched rows where we asked for them, held
// ones elsewhere. An id that vanished between the check and the fetch is left
// out, exactly as a full read would have done.
export function assembleSnapshot(ids, changed, fetched, held) {
  const wanted = new Set(changed);
  const fresh = new Map((fetched || []).map((item) => [item.id, item]));
  return ids.map((id) => (wanted.has(id) ? fresh.get(id) : held.get(id))).filter(Boolean);
}

export function tooManyToTarget(changed) {
  return changed.length > MAX_TARGETED_IDS;
}
