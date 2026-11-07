import { coalesceReturns } from './returnGate.js';
import { isMissingSyncDigest, readSyncDigest } from '../api/syncDigest.js';

// How often a synced view checks again while open: one interval for all.
export const RECOVERY_INTERVAL_MS = 30_000;

// When to check again for what realtime may have missed (or what a failed write
// left behind): the one set of triggers every synced view uses.
//
//   - 'online'   the network came back;
//   - 'focus' / 'visible'  the user came back to the tab (a tab coming back
//     fires both, often twice on a phone: coalesced into one run);
//   - 'interval' every RECOVERY_INTERVAL_MS while the page is shown, or also
//     hidden with `whenHidden` (a projector or a background map must keep
//     following).
//
// One heartbeat for the whole client — one timer and one set of window
// listeners, live while anything is registered — and two ways to register:
//
//   - watchRevisions(keys, onChange): server state. On each trigger the
//     heartbeat asks the database ONCE for the revision of every key any open
//     view watches (readSyncDigest, keys from syncKeys.js) and calls only the
//     views whose keys moved since they last saw them, with those keys. A view
//     newly watching a key sees it as moved the first time.
//   - listenForRecovery(run): local work (resending unsaved changes, retrying
//     a failed save, repairing a picture). Runs on every trigger, no read.
//
// Realtime's own SUBSCRIBED (first join and every reconnect) stays with each
// channel, which already knows when it happens.

// `run(reason)` on every trigger; the interval only with `periodic`. Returns
// the function that stops listening.
export function listenForRecovery(run, { periodic = false, whenHidden = false } = {}) {
  return register(localChecks, { run, periodic, whenHidden });
}

// `onChange(reason, movedKeys)` when any of `keys` moved, on every trigger
// including the interval. It may return a promise; resolving `false` (or
// failing) means "could not catch up", and the keys count as moved again next
// time. Without the database function (26_sync_digest.sql not run) or when the
// read fails, every view is called with all its keys, as before the digest.
// Returns the function that stops watching.
export function watchRevisions(keys, onChange, { whenHidden = false } = {}) {
  const watched = [...new Set((keys || []).filter(Boolean))];
  if (!watched.length) return () => {};
  return register(revisionWatchers, {
    keys: watched, onChange, whenHidden, periodic: true, seen: new Map(), busySince: null,
  });
}

const localChecks = new Set();
const revisionWatchers = new Set();
let heartbeat = null;
let digestMissing = false;
let digestInFlight = false;

function register(group, entry) {
  group.add(entry);
  if (!heartbeat) startHeartbeat();
  return () => {
    if (!group.delete(entry)) return;
    if (!localChecks.size && !revisionWatchers.size) stopHeartbeat();
  };
}

function trigger(reason) {
  const hidden = document.visibilityState === 'hidden';
  const applies = (entry) => reason !== 'interval' || (entry.periodic && (entry.whenHidden || !hidden));
  [...localChecks].filter(applies).forEach((check) => {
    // One that throws does not stop the others; its error still surfaces.
    try {
      check.run(reason);
    } catch (error) {
      queueMicrotask(() => { throw error; });
    }
  });
  checkRevisions(reason, [...revisionWatchers].filter(applies));
}

async function checkRevisions(reason, watchers) {
  // A view still catching up from the last trigger is asked again next time —
  // unless it has hung for a whole interval (a read that never answers).
  const now = Date.now();
  const due = watchers.filter((watcher) => (
    watcher.busySince == null || now - watcher.busySince >= RECOVERY_INTERVAL_MS
  ));
  if (!due.length || digestInFlight) return;
  let answers = null;
  if (!digestMissing) {
    digestInFlight = true;
    try {
      answers = await readSyncDigest([...new Set(due.flatMap((watcher) => watcher.keys))]);
    } catch (error) {
      if (isMissingSyncDigest(error)) digestMissing = true;
    } finally {
      digestInFlight = false;
    }
  }
  due.forEach((watcher) => {
    if (!revisionWatchers.has(watcher)) return;
    const moved = answers
      ? watcher.keys.filter((key) => !watcher.seen.has(key) || watcher.seen.get(key) !== (answers[key] ?? null))
      : watcher.keys;
    if (moved.length) deliver(watcher, reason, moved, answers);
  });
}

async function deliver(watcher, reason, moved, answers) {
  const since = Date.now();
  watcher.busySince = since;
  let caughtUp = false;
  try {
    caughtUp = (await watcher.onChange(reason, moved)) !== false;
  } catch (_) {
    // Counted as moved again on the next trigger.
  }
  // A delivery that hung and was overtaken by a newer one leaves no mark.
  if (watcher.busySince !== since) return;
  watcher.busySince = null;
  if (caughtUp && answers) moved.forEach((key) => watcher.seen.set(key, answers[key] ?? null));
}

function startHeartbeat() {
  const onReturn = coalesceReturns(trigger);
  const onFocus = () => onReturn('focus');
  const onVisible = () => {
    if (document.visibilityState === 'visible') onReturn('visible');
  };
  const onOnline = () => trigger('online');
  const timer = window.setInterval(() => trigger('interval'), RECOVERY_INTERVAL_MS);
  window.addEventListener('online', onOnline);
  window.addEventListener('focus', onFocus);
  document.addEventListener('visibilitychange', onVisible);
  heartbeat = () => {
    window.clearInterval(timer);
    window.removeEventListener('online', onOnline);
    window.removeEventListener('focus', onFocus);
    document.removeEventListener('visibilitychange', onVisible);
  };
}

function stopHeartbeat() {
  heartbeat?.();
  heartbeat = null;
}
