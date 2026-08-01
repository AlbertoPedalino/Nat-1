export const PERMISSION_ERROR_PATTERN = /row-level security|policy|owner|permission|denied|not authentic/i;

export function createCloudAutoSyncEngine({
  delay,
  emit,
  isActive,
  setTimer = setTimeout,
  clearTimer = clearTimeout,
}) {
  const timers = new Map();
  const blocked = new Set();

  function cancel(key) {
    const timer = timers.get(key);
    if (timer != null) clearTimer(timer);
    timers.delete(key);
  }

  function schedule({ key, id, push, canSync = () => true }) {
    if (!key || !id || blocked.has(key) || !isActive() || !canSync()) return false;
    cancel(key);
    const timer = setTimer(async () => {
      timers.delete(key);
      if (blocked.has(key) || !isActive() || !canSync()) return;
      emit(id, 'syncing');
      try {
        await push();
        emit(id, 'synced');
      } catch (error) {
        const message = String(error?.message || error);
        if (PERMISSION_ERROR_PATTERN.test(message)) blocked.add(key);
        emit(id, 'error', message);
      }
    }, delay);
    timers.set(key, timer);
    return true;
  }

  function unblock(key) {
    blocked.delete(key);
  }

  function dispose() {
    for (const timer of timers.values()) clearTimer(timer);
    timers.clear();
  }

  return Object.freeze({
    schedule,
    cancel,
    unblock,
    dispose,
    isBlocked: (key) => blocked.has(key),
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
