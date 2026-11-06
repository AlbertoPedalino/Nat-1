import { useCallback, useEffect } from 'react';
import { loadBackgrounds, loadFeats, loadSpecies } from '../data/characterOptionData.js';
import { loadClassIndex, loadOptionalFeatures } from '../data/classData.js';
import { loadItems } from '../data/itemData.js';
import { loadSpells } from '../data/spellData.js';
import { loadBeasts } from '../data/beastData.js';

// The game data the builder needs, by scope: how to load it and where it goes
// in `state.data`. Scope names are also what the load-error banner shows.
const BUILDER_DATA = {
  classes: [loadClassIndex, (result) => ({
    classCache: result.cache,
    classes: result.classes,
    subclasses: result.subclasses,
    classFeatures: result.classFeatures,
    subclassFeatures: result.subclassFeatures,
  })],
  species: [loadSpecies, (species) => ({ species })],
  backgrounds: [loadBackgrounds, (backgrounds) => ({ backgrounds })],
  feats: [loadFeats, (feats) => ({ feats })],
  spells: [loadSpells, (result) => ({ spells: result.spells, classSpellIndex: result.classSpellIndex })],
  items: [loadItems, (items) => ({ items })],
  optionalFeatures: [loadOptionalFeatures, (optionalFeatures) => ({ optionalFeatures })],
  beasts: [loadBeasts, (beasts) => ({ beasts })],
};

export const BUILDER_DATA_LABELS = {
  optionalFeatures: 'optional features',
};

// Loads every scope once; the returned function loads the given scopes again
// (a failed download is not cached, so a retry really downloads).
export function useBuilderData(dispatch) {
  const load = useCallback((scopes = Object.keys(BUILDER_DATA)) => {
    scopes.forEach(async (scope) => {
      const [loader, toData] = BUILDER_DATA[scope];
      dispatch({ type: 'data/load-start', scope });
      try {
        dispatch({ type: 'data/load-success', scope, payload: toData(await loader()) });
      } catch (error) {
        dispatch({ type: 'data/load-error', scope, error: error?.message || String(error) });
      }
    });
  }, [dispatch]);

  useEffect(() => { load(); }, [load]);
  return load;
}
