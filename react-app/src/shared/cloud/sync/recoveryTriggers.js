import { coalesceReturns } from './returnGate.js';

// How often a synced view checks again while open: one interval for all.
export const RECOVERY_INTERVAL_MS = 30_000;

// When to check again for what realtime may have missed (or what a failed write
// left behind): the one set of triggers every synced view uses.
//
//   - 'online'   the network came back;
//   - 'focus' / 'visible'  the user came back to the tab (a tab coming back
//     fires both, often twice on a phone: coalesced into one run);
//   - 'interval' with `periodic`, every RECOVERY_INTERVAL_MS while the page is
//     shown, or also hidden with `whenHidden` (a projector or a background map
//     must keep following).
//
// One heartbeat for the whole client: every open view registers its check
// here, and a trigger runs all of them together — one timer and one set of
// window listeners, live while anything is registered. Each check keeps its
// own query and state; the heartbeat only lines them up.
//
// Realtime's own SUBSCRIBED (first join and every reconnect) stays with each
// channel, which already knows when it happens. `run(reason)` gets the reason;
// most callers ignore it. Returns the function that stops listening.
export function listenForRecovery(run, { periodic = false, whenHidden = false } = {}) {
  const check = { run, periodic, whenHidden };
  checks.add(check);
  if (checks.size === 1) startHeartbeat();
  return () => {
    if (!checks.delete(check)) return;
    if (checks.size === 0) stopHeartbeat();
  };
}

const checks = new Set();
let heartbeat = null;

// Run every registered check that `applies`; one that throws does not stop
// the others (its error still surfaces).
function runChecks(reason, applies = () => true) {
  [...checks].filter(applies).forEach((check) => {
    try {
      check.run(reason);
    } catch (error) {
      queueMicrotask(() => { throw error; });
    }
  });
}

function startHeartbeat() {
  const onReturn = coalesceReturns((reason) => runChecks(reason));
  const onFocus = () => onReturn('focus');
  const onVisible = () => {
    if (document.visibilityState === 'visible') onReturn('visible');
  };
  const onOnline = () => runChecks('online');
  const timer = window.setInterval(() => {
    const hidden = document.visibilityState === 'hidden';
    runChecks('interval', (check) => check.periodic && (check.whenHidden || !hidden));
  }, RECOVERY_INTERVAL_MS);
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
