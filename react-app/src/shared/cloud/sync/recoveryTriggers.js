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
// Realtime's own SUBSCRIBED (first join and every reconnect) stays with each
// channel, which already knows when it happens. `run(reason)` gets the reason;
// most callers ignore it. Returns the function that stops listening.
export function listenForRecovery(run, { periodic = false, whenHidden = false } = {}) {
  const onReturn = coalesceReturns((reason) => run(reason));
  const onFocus = () => onReturn('focus');
  const onVisible = () => {
    if (document.visibilityState === 'visible') onReturn('visible');
  };
  const onOnline = () => run('online');
  const timer = periodic
    ? window.setInterval(() => {
      if (whenHidden || document.visibilityState !== 'hidden') run('interval');
    }, RECOVERY_INTERVAL_MS)
    : null;
  window.addEventListener('online', onOnline);
  window.addEventListener('focus', onFocus);
  document.addEventListener('visibilitychange', onVisible);
  return () => {
    if (timer != null) window.clearInterval(timer);
    window.removeEventListener('online', onOnline);
    window.removeEventListener('focus', onFocus);
    document.removeEventListener('visibilitychange', onVisible);
  };
}
