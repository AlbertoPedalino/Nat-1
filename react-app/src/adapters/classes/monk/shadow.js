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
  { name: "Shadow Arts", icon: "", cat: "action", uses: "1 Focus Point (Darkness)", resKey: "ki", minLevel: 3 },
  { name: "Shadow Step", icon: "", cat: "bonus", uses: "At will", minLevel: 6 },
  { name: "Improved Shadow Step", icon: "", cat: "bonus", uses: "1 Focus Point", resKey: "ki", minLevel: 11 },
  { name: "Cloak of Shadows", icon: "", cat: "action", uses: "3 Focus Points / 1 min", resKey: "ki", minLevel: 17 },
]);
registerSubclassRuntimeConfig("Monk_Shadow", {
  spellcasting: {
    ability: "wis",
    alwaysKnownSpells: [
      { name: "Minor Illusion", minLevel: 3, level: 0 },
    ],
  },
});

registerSubclassSheetEffects("Monk_Shadow", [

  { type: "darkvision", value: 60, additive: true, minLevel: 3, note: "Shadow Arts: Darkvision 60 ft or +60 ft if you already have it." },
  { type: "teleport", minLevel: 6, note: "Shadow Step." },
  { type: "invisibility", minLevel: 11, note: "Improved Shadow Step / Cloak of Shadows." },
  { type: "reactionAttack", minLevel: 17, note: "Opportunist." },
]);

}

