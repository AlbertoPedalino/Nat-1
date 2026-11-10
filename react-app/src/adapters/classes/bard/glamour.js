import { createAdapterBindings } from '../../adapterBindings.js';

export default function install(registry, context = {}) {
  const {
    registerSubclassAdapter,
    registerSubclassSheetActions,
    registerSubclassSheetResources,
    registerSubclassSheetEffects,
    registerSubclassRuntimeConfig,
  } = createAdapterBindings(registry, context);
registerSubclassAdapter("Bard_Glamour", function (cls, lv, specs) {});

registerSubclassSheetActions("Bard_Glamour", [
  { name: "Beguiling Magic", cat: "bonus", resKey: "glamour_beguiling", minLevel: 3 },
  { name: "Mantle of Inspiration", cat: "bonus", minLevel: 3 },
  { name: "Mantle of Majesty", cat: "bonus", resKey: "glamour_majesty", minLevel: 6 },
  { name: "Unbreakable Majesty", cat: "bonus", resKey: "glamour_unbreakable", minLevel: 14 },
]);

registerSubclassSheetResources("Bard_Glamour", [
  { key: "glamour_beguiling",  name: "Beguiling Magic",   recharge: "LR", minLevel: 3, max: 1 },
  { key: "glamour_majesty",    name: "Mantle of Majesty",  recharge: "LR", minLevel: 6, max: 1 },
  { key: "glamour_unbreakable",name: "Unbreakable Majesty",recharge: "SR", minLevel: 14, max: 1 },
]);
registerSubclassRuntimeConfig("Bard_Glamour", {
  spellcasting: {
    alwaysPreparedSpells: [
      { name: "Charm Person", minLevel: 3, level: 1 },
      { name: "Mirror Image", minLevel: 3, level: 2 },
      { name: "Command", minLevel: 6, level: 1 },
    ],
  },
});

registerSubclassSheetEffects("Bard_Glamour", [

  { type: "tempHp", minLevel: 3, note: "Mantle of Inspiration: grant Temporary HP and movement." },
]);

}

