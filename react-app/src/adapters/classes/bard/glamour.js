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

// [SheetRuntime] START
registerSubclassSheetActions("Bard_Glamour", [
  { name: "Beguiling Magic", icon: "", cat: "bonus", uses: "1 / LR", resKey: "glamour_beguiling", minLevel: 3 },
  { name: "Mantle of Inspiration", icon: "", cat: "bonus", uses: "With Bardic Insp.", minLevel: 3 },
  { name: "Mantle of Majesty", icon: "", cat: "bonus", uses: "1 / LR", resKey: "glamour_majesty", minLevel: 6 },
  { name: "Unbreakable Majesty", icon: "", cat: "bonus", uses: "1 / SR", resKey: "glamour_unbreakable", minLevel: 14 },
]);

registerSubclassSheetResources("Bard_Glamour", [
  { key: "glamour_beguiling",  name: "Beguiling Magic",   icon: "sparkles", recharge: "LR", max: (lv) => lv >= 3  ? 1 : 0 },
  { key: "glamour_majesty",    name: "Mantle of Majesty",  icon: "crown",    recharge: "LR", max: (lv) => lv >= 6  ? 1 : 0 },
  { key: "glamour_unbreakable",name: "Unbreakable Majesty",icon: "shield",   recharge: "SR", max: (lv) => lv >= 14 ? 1 : 0 },
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
  { type: "charm", minLevel: 6, note: "Mantle of Majesty: Command as Bonus Action while active." },
  { type: "defense", minLevel: 14, note: "Unbreakable Majesty: attackers may fail to attack you." },
]);
// [SheetRuntime] END

}

