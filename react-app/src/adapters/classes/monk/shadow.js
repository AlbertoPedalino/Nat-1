import { createAdapterBindings } from '../../adapterBindings.js';

export default function install(registry, context = {}) {
  const {
    registerSubclassAdapter,
    registerSubclassSheetActions,
    registerSubclassSheetEffects,
    registerSubclassRuntimeConfig,
  } = createAdapterBindings(registry, context);
registerSubclassAdapter("Monk_Shadow", function (cls, lv, specs) {});

registerSubclassSheetActions("Monk_Shadow", [
  { name: "Shadow Arts", cat: "action", resKey: "ki", minLevel: 3 },
  { name: "Shadow Step", cat: "bonus", minLevel: 6 },
  { name: "Improved Shadow Step", cat: "bonus", resKey: "ki", minLevel: 11 },
  { name: "Cloak of Shadows", cat: "action", resKey: "ki", minLevel: 17 },
]);
registerSubclassRuntimeConfig("Monk_Shadow", {
  spellcasting: {
    ability: "wis",
  },
});

registerSubclassSheetEffects("Monk_Shadow", [

  { type: "darkvision", value: 60, additive: true, minLevel: 3, note: "Shadow Arts: Darkvision 60 ft or +60 ft if you already have it." },
  { type: "teleport", minLevel: 6, note: "Shadow Step." },
]);

}

