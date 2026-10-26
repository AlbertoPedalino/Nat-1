import { useEffect, useState } from 'react';
import {
  loadActions,
  loadBackgrounds,
  loadClassIndex,
  loadConditionRecords,
  loadFeats,
  loadItemGroups,
  loadItems,
  loadOptionalFeatures,
  loadSkills,
  loadSpecies,
  loadSpells,
  loadVariantRules,
} from '../charbuilder/data/dataLoaders.js';
import { CLASS_ALLOWED_SOURCES, isAllowedSource } from '../../shared/content/sourcePriority.js';
import { getJson, loadMonsterDatabase } from '../encounterbuilder/bestiary/bestiary.js';
import { IMAGE_BASE } from '../encounterbuilder/state/constants.js';
import { itemGroupLookup, itemImageMap, itemPicture } from './itemCatalog.js';
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
  classFeature: () => loadClassIndex().then(classFeatureRecords),
  option: loadOptionalFeatures,
  skill: loadSkills,
});

// The features of the supported classes (the class files also hold the 2014
// ones), subclass features named with their subclass.
function classFeatureRecords({ classFeatures = [], subclasses = [], subclassFeatures = [] }) {
  const supported = (feature) => isAllowedSource(feature.classSource, CLASS_ALLOWED_SOURCES) && Array.isArray(feature.entries);
  const subclassName = new Map(subclasses.map((sub) => [`${sub.className}|${sub.classSource}|${sub.shortName}|${sub.source}`, sub.name]));
  return [
    ...classFeatures.filter(supported),
    ...subclassFeatures.filter(supported).map((feature) => ({
      ...feature,
      subclassName: subclassName.get(`${feature.className}|${feature.classSource}|${feature.subclassShortName}|${feature.subclassSource}`)
        || feature.subclassShortName,
    })),
  ];
}

let compendiumPromise = null;

export function loadCompendium() {
  if (compendiumPromise) return compendiumPromise;
  const kinds = Object.keys(LOADERS);
  // Item pictures ride along; without them the items still load.
  const pictures = Promise.all([
    getJson('fluff-items.json').then((json) => itemImageMap(json, IMAGE_BASE)),
    loadItemGroups().then(itemGroupLookup).catch(() => () => null),
  ]).catch(() => null);
  compendiumPromise = Promise.all([Promise.allSettled(kinds.map((kind) => LOADERS[kind]())), pictures]).then(([results, images]) => {
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
    const index = buildCompendiumIndex(records);
    // The index's entries are the compendium's own: a picture can be noted on
    // an item entry without touching the item record the sheet shares.
    if (images) {
      const [imageMap, groupOf] = images;
      index.forEach((entry) => {
        if (entry.kind === 'item') entry.image = itemPicture(entry.record, imageMap, groupOf);
      });
    }
    return { index, legendaryGroups, failed };
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
