import { useEffect } from 'react';
import { adapterRegistry } from '../../../adapters/registry.js';
import { loadClassAdapters, loadCoreAdapters } from '../../../adapters/index.js';
import { adaptBuilderData } from '../../../adapters/adapterPipeline.js';
import { classNames } from '../../../shared/character/progression/classLevel.js';
import { failureMessage } from '../../../shared/ui/busyAction.js';

// Loads the core and class adapters once the items are in, loads more when a
// class is added, and runs the loaded game data through them once everything
// has arrived.
export function useBuilderAdapters(state, dispatch, notify) {
  useEffect(() => {
    // Classes and species first: a class skin loads its base class's adapters.
    if (state.adaptersLoaded || state.loading.items || state.loading.classes || state.loading.species) return;
    let cancelled = false;
    const activeClasses = classNames(state.character);
    Promise.all([
      loadCoreAdapters({ items: state.data.items }),
      loadClassAdapters(activeClasses, { items: state.data.items }),
    ])
      .then(() => {
        if (!cancelled) dispatch({ type: 'adapters/loaded' });
      })
      .catch((error) => {
        if (!cancelled) notify('error', failureMessage('Could not load the class rules.', error));
      });
    return () => {
      cancelled = true;
    };
  }, [state.adaptersLoaded, state.loading.items, state.loading.classes, state.loading.species, state.data.items]);

  useEffect(() => {
    if (!state.adaptersLoaded) return;
    const classes = classNames(state.character);
    if (!classes.length) return;
    let cancelled = false;
    loadClassAdapters(classes, { items: state.data.items })
      .then((result) => {
        if (cancelled) return;
        if (result?.loadedNewAdapters) {
          dispatch({ type: 'adapters/loaded-for-classes', classes: result.loadedClasses });
        }
      })
      .catch((error) => {
        if (!cancelled) notify('error', failureMessage('Could not load the class rules.', error));
      });
    return () => { cancelled = true; };
  }, [state.adaptersLoaded, state.character.className, state.character.extraClasses, state.data.items]);

  useEffect(() => {
    if (!state.adaptersLoaded || state.dataAdapted || Object.values(state.loading).some(Boolean)) return;
    const adaptedData = adaptBuilderData(state.data, adapterRegistry, { items: state.data.items, itemsAlreadyAdapted: true });
    dispatch({ type: 'data/adapt', payload: adaptedData });
  }, [state.adaptersLoaded, state.dataAdapted, state.loading, state.data]);
}
