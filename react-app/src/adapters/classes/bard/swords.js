import { createAdapterBindings } from '../../adapterBindings.js';

export default function install(registry, context = {}) {
  const {
    registerSubclassAdapter,
    registerSubclassSheetActions,
    registerSubclassSheetEffects,
    registerSubclassSheetProficiencies,
  } = createAdapterBindings(registry, context);
registerSubclassAdapter("Bard_Swords", function (cls, lv, specs) {
  if (lv >= 3) {
    specs.push({
      key: 'subclass_swords_fighting_style',
      label: 'Fighting Style (College of Swords)',
      type: 'feat_cat',
      categories: ['FS'],
      count: 1,
      level: 3
    });
  }
});

registerSubclassSheetActions("Bard_Swords", [
  { name: "Blade Flourish",    icon: "", cat: "attack", uses: "Per attack action", minLevel: 3 },
]);
registerSubclassSheetProficiencies("Bard_Swords", [
  { type: "armor", values: ["Medium"], minLevel: 3 },
  { type: "weapon", values: ["Scimitar"], minLevel: 3 },
]);


}

