import { useEffect, useRef, useState } from 'react';

// How a tool page keeps its instance in the local store: `hydrate()` once per
// instance as soon as the page is `ready` (the provider is remounted via its
// key on a switch or after a cloud pull), then `persist()` whenever one of
// `persistDeps` changes. The first save of a new instance writes its initial
// state, which is what gives it data to sync. Saving unchanged state is a
// no-op in the store, so re-writing freshly hydrated state neither marks it
// dirty nor syncs it back. Returns whether hydration has run.
export function useInstancePersistence({ instanceId, ready = true, hydrate, persist, persistDeps = [] }) {
  const [hydrated, setHydrated] = useState(false);
  const actions = useRef({});
  actions.current = { hydrate, persist };

  useEffect(() => {
    if (hydrated || !instanceId || !ready) return;
    actions.current.hydrate();
    setHydrated(true);
  }, [hydrated, instanceId, ready]);

  // Runs from the render after hydration, so it never writes pre-hydration state.
  useEffect(() => {
    if (hydrated && instanceId) actions.current.persist();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, instanceId, ...persistDeps]);

  return hydrated;
}
