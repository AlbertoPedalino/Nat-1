import { requireClient } from '../supabaseClient.js';
import { tagSync } from '../sync/syncDiagnostics.js';

// One read for everything this client has open (26_sync_digest.sql): the
// answer for each key (shared/cloud/sync/syncKeys.js), null for a row that is
// missing or unreadable.
export async function readSyncDigest(keys) {
  tagSync('sync digest');
  const { data, error } = await requireClient().rpc('sync_digest', { watch: keys });
  if (error) throw error;
  return data && typeof data === 'object' ? data : {};
}

// The database has no sync_digest yet (26_sync_digest.sql not run).
export function isMissingSyncDigest(error) {
  return error?.code === 'PGRST202' || error?.code === '42883';
}
