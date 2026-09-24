// Sharing the ruler with the table without flooding the socket.
//
// The person measuring redraws on every pointer move; the table is told at
// most ~16 times a second, never about a position it already has, always
// about the last one (trailing send), and always told when the ruler goes
// away. While the ruler is held still it is re-sent now and then, so the
// receivers' TTL only clears a ruler whose owner disappeared.

export const MEASURE_BROADCAST_MS = 60;
export const MEASURE_KEEPALIVE_MS = 1_500;
// Receivers drop a ruler not refreshed for this long: a dropped connection or
// a closed tab never sends its release.
export const REMOTE_MEASURE_TTL_MS = 4_000;
// In cells. Finer than anyone can see at table zoom.
const NEAR_CELLS = 0.05;

function nearPoint(a, b) {
  return Math.abs((a?.x ?? 0) - (b?.x ?? 0)) < NEAR_CELLS && Math.abs((a?.y ?? 0) - (b?.y ?? 0)) < NEAR_CELLS;
}

export function nearlySameMeasure(a, b) {
  if (!a || !b) return a === b;
  return a.shape === b.shape && a.label === b.label && nearPoint(a.from, b.from) && nearPoint(a.to, b.to);
}

export function createMeasurePublisher({
  send,
  intervalMs = MEASURE_BROADCAST_MS,
  keepaliveMs = MEASURE_KEEPALIVE_MS,
  now = () => Date.now(),
  schedule = (run, ms) => setTimeout(run, ms),
  cancel = (id) => clearTimeout(id),
}) {
  let last = -Infinity;
  let sent = null;
  let pending = null;
  let timer = null;
  let keepalive = null;
  let active = false;

  const stopTimers = () => {
    if (timer !== null) cancel(timer);
    if (keepalive !== null) cancel(keepalive);
    timer = null;
    keepalive = null;
    pending = null;
  };

  const transmit = (value) => {
    sent = value;
    last = now();
    send(value);
    if (keepalive !== null) cancel(keepalive);
    keepalive = schedule(() => {
      keepalive = null;
      if (active && sent) transmit(sent);
    }, keepaliveMs);
  };

  const flush = () => {
    timer = null;
    const value = pending;
    pending = null;
    if (active && value && !nearlySameMeasure(value, sent)) transmit(value);
  };

  return {
    update(next) {
      if (!next) return;
      active = true;
      if (timer !== null) {
        pending = next;
        return;
      }
      if (nearlySameMeasure(next, sent)) return;
      const wait = intervalMs - (now() - last);
      if (wait <= 0) {
        transmit(next);
        return;
      }
      pending = next;
      timer = schedule(flush, wait);
    },
    // Release, cancel, tool change or unmount. Tells the table only if it was
    // shown something, so a click or a pinch costs nothing.
    finish() {
      active = false;
      stopTimers();
      if (sent === null) return;
      sent = null;
      send(null);
    },
  };
}
