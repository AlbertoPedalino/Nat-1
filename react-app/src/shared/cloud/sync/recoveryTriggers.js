import { coalesceReturns } from './returnGate.js';

// When to check again for what realtime may have missed (or what a failed write
// left behind): the one set of triggers every synced view uses.
//
//   - 'online'   the network came back;
//   - 'focus' / 'visible'  the user came back to the tab (a tab coming back
//     fires both, often twice on a phone: coalesced into one run);
//   - 'interval' every `intervalMs`, only while the page is shown unless
//     `whenHidden` (a projector or a background map must keep following).
//
// Realtime's own SUBSCRIBED (first join and every reconnect) stays with each
// channel, which already knows when it happens. `run(reason)` gets the reason;
// most callers ignore it. Returns the function that stops listening.
export function listenForRecovery(run, { intervalMs = null, whenHidden = false } = {}) {
  const onReturn = coalesceReturns((reason) => run(reason));
  const onFocus = () => onReturn('focus');
  const onVisible = () => {
    if (document.visibilityState === 'visible') onReturn('visible');
  };
  const onOnline = () => run('online');
  const timer = intervalMs
    ? window.setInterval(() => {
      if (whenHidden || document.visibilityState !== 'hidden') run('interval');
    }, intervalMs)
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
