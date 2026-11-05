// The light recovery every synced list uses: compare the ids and versions the
// database reports with what this client holds, name only the rows worth
// fetching, and fetch just those (or everything, past MAX_TARGETED_IDS).
//
// Versions are the tables' `updated_at` (pieces, marks, fights, hex cells) or
// a revision counter (character digests' `row_revision`).

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

// The rows a diff named: none, the changed ones by id, or one full read when
// there are too many to list.
export function readChanged(diff, { fetchAll, fetchSome }) {
  if (!diff?.changed?.length) return Promise.resolve([]);
  return tooManyToTarget(diff.changed) ? fetchAll() : fetchSome(diff.changed);
}
