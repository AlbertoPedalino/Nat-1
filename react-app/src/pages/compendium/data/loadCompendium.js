import { loadActions, loadConditionRecords, loadSkills, loadVariantRules } from '../../../shared/content/catalogs/rulesData.js';
import { loadBackgrounds, loadFeats, loadSpecies } from '../../../shared/content/catalogs/characterOptionData.js';
import { loadClassIndex, loadOptionalFeatures } from '../../../shared/content/catalogs/classData.js';
import { loadItemGroups, loadItems } from '../../../shared/content/catalogs/itemData.js';
import { loadSpells } from '../../../shared/content/catalogs/spellData.js';
import { CLASS_ALLOWED_SOURCES, isAllowedSource } from '../../../shared/content/sourcePriority.js';
import { loadMonsterDatabase } from '../../../shared/bestiary/bestiary.js';
import { GAME_IMAGE_BASE, loadGameData } from '../../../shared/content/gameData.js';
import { itemGroupLookup, itemImageMap, itemPicture } from './itemPictures.js';
import { spellClasses } from '../catalogs/spellCatalog.js';
import { buildCompendiumIndex } from '../search/compendiumIndex.js';
import { useLoaded } from '../../../shared/ui/useLoaded.js';
import { cachedLoader } from '../../../shared/content/cachedLoader.js';

// Every kind at once, each from the loader the rest of the app uses (and so
// from the same per-file cache). A kind that fails to load is left out and
// named, rather than costing the others. Built once per tab.
const LOADERS = Object.freeze({
  spell: loadSpells,
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

// Offline, nothing loads: the next opening asks again.
export const loadCompendium = cachedLoader(() => {
  const kinds = Object.keys(LOADERS);
  // Item pictures ride along; without them the items still load.
  const pictures = Promise.all([
    loadGameData('fluff-items.json').then((json) => itemImageMap(json, GAME_IMAGE_BASE)),
    loadItemGroups().then(itemGroupLookup).catch(() => () => null),
  ]).catch(() => null);
  return Promise.all([Promise.allSettled(kinds.map((kind) => LOADERS[kind]())), pictures]).then(([results, images]) => {
    const records = {};
    const failed = [];
    let legendaryGroups = new Map();
    let classSpellIndex = {};
    results.forEach((result, index) => {
      const kind = kinds[index];
      if (result.status !== 'fulfilled') {
        failed.push(kind);
        return;
      }
      if (kind === 'monster') {
        records.monster = result.value.statBlocks;
        legendaryGroups = result.value.legendaryGroups || legendaryGroups;
      } else if (kind === 'spell') {
        records.spell = result.value.spells;
        // Class name -> spell names (arrays), made sets once for the lookups.
        classSpellIndex = Object.fromEntries(Object.entries(result.value.classSpellIndex || {})
          .map(([name, spells]) => [name, new Set(spells)]));
      } else {
        records[kind] = result.value;
      }
    });
    const index = buildCompendiumIndex(records);
    // Noted on the compendium's own entries: the class lists a spell is on (a
    // creature's token is MonsterToken's to find).
    index.forEach((entry) => {
      if (entry.kind === 'spell') entry.classes = spellClasses(entry.record, classSpellIndex);
    });
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
}, { failed: (result) => result.failed.length === Object.keys(LOADERS).length });

const EMPTY = Object.freeze({ index: [], legendaryGroups: new Map(), failed: [] });

// { status, index, legendaryGroups, failed }: a load that brought nothing at
// all is an error.
export function useCompendium() {
  const { status, data } = useLoaded(loadCompendium, [], { initial: EMPTY });
  return { ...data, status: status === 'ready' && !data.index.length ? 'error' : status };
}
