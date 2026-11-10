import { createAdapterBindings } from '../../adapterBindings.js';

export default function install(registry, context = {}) {
  const {
    registerSubclassAdapter,
    registerSubclassSheetActions,
    registerSubclassSheetEffects,
    registerSubclassRuntimeConfig,
  } = createAdapterBindings(registry, context);
// Trickery Domain (XPHB): tutte le feature sono passive o azioni fisse, nessuna scelta di build.
// L3: Blessing of the Trickster, Invoke Duplicity (CD)
// L6: Cloak of Shadows (CD)
// L17: Improved Duplicity
registerSubclassAdapter("Cleric_Trickery", function (cls, lv, specs) {
  // nessuna spec
});

registerSubclassSheetActions("Cleric_Trickery", [
  { name: "Blessing of the Trickster", cat: "action", minLevel: 3 },
  { name: "Invoke Duplicity", cat: "bonus", resKey: "channel_div" },
  { name: "Cloak of Shadows", cat: "action", resKey: "channel_div", minLevel: 6 },
]);
registerSubclassRuntimeConfig("Cleric_Trickery", {
  spellcasting: {
    alwaysPreparedSpells: [
      { name: "Charm Person", minLevel: 3, level: 1 },
      { name: "Disguise Self", minLevel: 3, level: 1 },
      { name: "Invisibility", minLevel: 3, level: 2 },
      { name: "Pass without Trace", minLevel: 3, level: 2 },
      { name: "Hypnotic Pattern", minLevel: 5, level: 3 },
      { name: "Nondetection", minLevel: 5, level: 3 },
      { name: "Confusion", minLevel: 7, level: 4 },
      { name: "Dimension Door", minLevel: 7, level: 4 },
      { name: "Dominate Person", minLevel: 9, level: 5 },
      { name: "Modify Memory", minLevel: 9, level: 5 },
    ],
  },
});

registerSubclassSheetEffects("Cleric_Trickery", [

  { type: "skillAdvantage", skill: "Stealth", minLevel: 3, note: "Blessing of the Trickster." },
]);

}

