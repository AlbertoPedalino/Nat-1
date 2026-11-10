// The two timing tools every sync path shares, keyed by whatever the caller
// syncs (an instance, a character, a fight):
//
//   createKeyedQueue()     one task per key at a time, in call order — a task
//                          starts after the previous one for its key settles,
//                          whether it succeeded or not;
//   createKeyedDebounce()  one pending run per key — scheduling again restarts
//                          its wait, so a burst of edits becomes one write.

export function createKeyedQueue() {
  const tails = new Map();
  const counts = new Map();
  return Object.freeze({
    // Runs `task()` after the key's previous task; resolves or rejects with it.
    run(key, task) {
      const previous = tails.get(key) || Promise.resolve();
      const next = previous.catch(() => {}).then(task);
      tails.set(key, next);
      counts.set(key, (counts.get(key) || 0) + 1);
      const release = () => {
        if (tails.get(key) === next) tails.delete(key);
        const left = counts.get(key) - 1;
        if (left > 0) counts.set(key, left);
        else counts.delete(key);
      };
      next.then(release, release);
      return next;
    },
    // How many of the key's tasks have not settled yet (running or waiting).
    pending: (key) => counts.get(key) || 0,
  });
}

// `setTimer` / `clearTimer` are injectable for tests that drive time by hand.
export function createKeyedDebounce({ delay = 0, setTimer = setTimeout, clearTimer = clearTimeout } = {}) {
  // key -> { timer, run }
  const timers = new Map();
  const cancel = (key) => {
    if (!timers.has(key)) return false;
    clearTimer(timers.get(key).timer);
    timers.delete(key);
    return true;
  };
  return Object.freeze({
    // Runs `run()` once the key has been quiet for `wait` ms (default `delay`).
    schedule(key, run, wait = delay) {
      cancel(key);
      timers.set(key, {
        run,
        timer: setTimer(() => {
          timers.delete(key);
          return run();
        }, wait),
      });
    },
    // Drops the key's pending run; true when there was one.
    cancel,
    cancelAll() {
      for (const { timer } of timers.values()) clearTimer(timer);
      timers.clear();
    },
    // Runs every pending run now, instead of after its wait.
    flushAll() {
      const due = [...timers.values()];
      timers.clear();
      for (const { timer, run } of due) {
        clearTimer(timer);
        run();
      }
    },
    has: (key) => timers.has(key),
  });
}
