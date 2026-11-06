import { createAdapterBindings } from '../../adapterBindings.js';

export default function install(registry, context = {}) {
  const { registerSubclassAdapter,  registerSubclassSheetEffects } = createAdapterBindings(registry, context);
registerSubclassAdapter("Fighter_Champion", function (cls, lv, specs) {
  if (lv >= 7) {
    specs.push({
      key: 'subclass_champion_extra_fs',
      label: 'Extra Fighting Style (Champion)',
      type: 'feat_cat',
      categories: ['FS'],
      count: 1,
      level: 7
    });
  }
});


registerSubclassSheetEffects("Fighter_Champion", [

  { type: "critRange", value: 19, minLevel: 3, note: "Improved Critical." },
  { type: "advantage", target: "initiative", minLevel: 3, note: "Remarkable Athlete / Heroic Warrior." },
  { type: "speed", value: 10, minLevel: 7, note: "Remarkable Athlete: Speed increases by 10 ft." },
  { type: "critRange", value: 18, minLevel: 15, note: "Superior Critical." },
  { type: "regeneration", minLevel: 18, note: "Survivor: regain HP at the start of your turn if Bloodied and not Incapacitated." },
]);

}

