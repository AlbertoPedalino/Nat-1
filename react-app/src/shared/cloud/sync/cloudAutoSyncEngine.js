export const PERMISSION_ERROR_PATTERN = /row-level security|policy|owner|permission|denied|not authentic/i;

// Debounced pushes, at most one in flight per key. A save requested while that
// key's push is running does not start a second one: it is remembered (only
// the latest request — pushes read the current copy themselves, so one later
// push covers every edit made meanwhile) and scheduled once the running push
// ends. That later push therefore starts from what the first one produced
// (e.g. its sheet_revision), instead of racing it with the same expected
// revision. Different keys sync in parallel.
//
// After a failure the waiting request is not turned into anything stronger:
// a permission error blocks the key, a conflict (`isConflict`) keeps it on
// hold until the user resolves it (their choice triggers a new save), and any
// other error lets it run as the ordinary next attempt.
export function createCloudAutoSyncEngine({
  delay,
  emit,
  isActive,
  isConflict = () => false,
  setTimer = setTimeout,
  clearTimer = clearTimeout,
}) {
  const timers = new Map();
  const blocked = new Set();
  const inFlight = new Set();
  const waiting = new Map();

  function cancel(key, id = null) {
    const timer = timers.get(key);
    if (timer != null) clearTimer(timer);
    timers.delete(key);
    const held = waiting.delete(key);
    if ((timer != null || held) && id) emit(id, 'cancelled');
  }

  async function run(job) {
    const { key, id, push, canSync = () => true } = job;
    if (blocked.has(key) || !isActive() || !canSync()) {
      emit(id, 'cancelled');
      return;
    }
    inFlight.add(key);
    emit(id, 'syncing');
    let failure = null;
    try {
      await push();
      emit(id, 'synced');
    } catch (error) {
      failure = error;
      const message = String(error?.message || error);
      if (PERMISSION_ERROR_PATTERN.test(message)) blocked.add(key);
      emit(id, 'error', message, error);
    } finally {
      inFlight.delete(key);
    }
    const next = waiting.get(key);
    waiting.delete(key);
    if (next && !(failure && isConflict(failure))) schedule(next);
  }

  function schedule(job) {
    const { key, id, canSync = () => true } = job;
    if (!key || !id || blocked.has(key) || !isActive() || !canSync()) return false;
    const timer = timers.get(key);
    if (timer != null) clearTimer(timer);
    timers.delete(key);
    if (inFlight.has(key)) {
      waiting.set(key, job);
      emit(id, 'scheduled');
      return true;
    }
    timers.set(key, setTimer(() => {
      timers.delete(key);
      return run(job);
    }, delay));
    emit(id, 'scheduled');
    return true;
  }

  function unblock(key) {
    blocked.delete(key);
  }

  function dispose() {
    for (const timer of timers.values()) clearTimer(timer);
    timers.clear();
    waiting.clear();
  }

  return Object.freeze({
    schedule,
    cancel,
    unblock,
    dispose,
    isBlocked: (key) => blocked.has(key),
    isInFlight: (key) => inFlight.has(key),
  });
}

export function registerSectionAutoSyncListeners({
  eventTarget,
  engine,
  sections,
  loadCloudSections,
}) {
  const listeners = Object.values(sections).map((section) => {
    const onSaved = (event) => {
      const id = event?.detail?.id;
      if (!id) return;
      engine.schedule({
        key: `${section.key}:${id}`,
        id,
        push: async () => {
          const cloudSections = await loadCloudSections();
          return cloudSections[section.key].pushInstance(id);
        },
      });
    };
    const onDeleted = (event) => {
      const id = event?.detail?.id;
      if (id) engine.cancel(`${section.key}:${id}`);
    };
    eventTarget.addEventListener(section.saveEvent, onSaved);
    eventTarget.addEventListener(section.deleteEvent, onDeleted);
    return { section, onSaved, onDeleted };
  });

  return () => {
    for (const { section, onSaved, onDeleted } of listeners) {
      eventTarget.removeEventListener(section.saveEvent, onSaved);
      eventTarget.removeEventListener(section.deleteEvent, onDeleted);
    }
  };
}
