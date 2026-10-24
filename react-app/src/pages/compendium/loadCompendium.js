import { useEffect, useState } from 'react';
import {
  loadActions,
  loadBackgrounds,
  loadConditionRecords,
  loadFeats,
  loadItems,
  loadSpecies,
  loadSpells,
  loadVariantRules,
} from '../charbuilder/data/dataLoaders.js';
import { loadMonsterDatabase } from '../encounterbuilder/bestiary/bestiary.js';
import { buildCompendiumIndex } from './compendiumIndex.js';

// Every kind at once, each from the loader the rest of the app uses (and so
// from the same per-file cache). A kind that fails to load is left out and
// named, rather than costing the others. Built once per tab.
const LOADERS = Object.freeze({
  spell: () => loadSpells().then((result) => result.spells),
  item: loadItems,
  monster: () => loadMonsterDatabase(),
  condition: loadConditionRecords,
  action: loadActions,
  rule: loadVariantRules,
  feat: loadFeats,
  species: loadSpecies,
  background: loadBackgrounds,
});

let compendiumPromise = null;

export function loadCompendium() {
  if (compendiumPromise) return compendiumPromise;
  const kinds = Object.keys(LOADERS);
  compendiumPromise = Promise.allSettled(kinds.map((kind) => LOADERS[kind]())).then((results) => {
    const records = {};
    const failed = [];
    let legendaryGroups = new Map();
    results.forEach((result, index) => {
      const kind = kinds[index];
      if (result.status !== 'fulfilled') {
        failed.push(kind);
        return;
      }
      if (kind === 'monster') {
        records.monster = result.value.monsters;
        legendaryGroups = result.value.legendaryGroups || legendaryGroups;
      } else {
        records[kind] = result.value;
      }
    });
    // Offline, nothing loads: the next opening asks again.
    if (failed.length === kinds.length) compendiumPromise = null;
    return { index: buildCompendiumIndex(records), legendaryGroups, failed };
  });
  return compendiumPromise;
}

export function useCompendium() {
  const [state, setState] = useState({ status: 'loading', index: [], legendaryGroups: new Map(), failed: [] });
  useEffect(() => {
    let cancelled = false;
    loadCompendium().then((payload) => {
      if (!cancelled) setState({ status: payload.index.length ? 'ready' : 'error', ...payload });
    });
    return () => { cancelled = true; };
  }, []);
  return state;
}
