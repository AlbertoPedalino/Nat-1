// Why a sync request was made, for the opt-in traffic counters
// (realtimeStats.js, `__gbRt.table()`): the REST rows say how many bytes went
// to `characters`, these tags say which of them were an initial load, a
// structural refresh, a recovery check or a conflict read. Counting only:
// nothing here changes a request, and it does nothing unless diagnostics are on.

let sink = null;

// Called once by supabaseClient.js with the stats object (or null).
export function setSyncDiagnostics(stats) {
  sink = stats && typeof stats.recordTag === 'function' ? stats : null;
}

export function tagSync(tag) {
  try { sink?.recordTag(tag); } catch (_) { /* diagnostics never break sync */ }
}
