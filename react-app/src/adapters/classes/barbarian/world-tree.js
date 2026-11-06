import { createAdapterBindings } from '../../adapterBindings.js';

export default function install(registry, context = {}) {
  const { registerSubclassAdapter, registerSubclassSheetActions, registerSubclassSheetEffects } = createAdapterBindings(registry, context);
registerSubclassAdapter("Barbarian_World Tree", function (cls, lv, specs) {});

registerSubclassSheetActions("Barbarian_World Tree", [
  { name: "Branches of the Tree", icon: "", cat: "reaction", uses: "While Raging", minLevel: 6 },
  { name: "Battering Roots", icon: "", cat: "action", uses: "While Raging", minLevel: 10 },
  { name: "Travel Along the Tree", icon: "", cat: "bonus", uses: "While Raging", minLevel: 14 },
]);

registerSubclassSheetEffects("Barbarian_World Tree", [

  { type: "tempHp", minLevel: 3, note: "Vitality of the Tree: grant Temporary HP while raging." },
  { type: "teleport", minLevel: 6, note: "Branches of the Tree: teleport a creature while raging." },
  { type: "reach", value: 10, minLevel: 10, note: "Battering Roots while raging." },
  { type: "teleport", minLevel: 14, note: "Travel Along the Tree." },
]);

}

