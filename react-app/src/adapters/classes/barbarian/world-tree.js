import { createAdapterBindings } from '../../adapterBindings.js';
import { saveDcPills } from '../../../shared/character/progression/featureSaveDc.js';

export default function install(registry, context = {}) {
  const { registerSubclassAdapter, registerSubclassSheetActions, registerSubclassSheetEffects } = createAdapterBindings(registry, context);
registerSubclassAdapter("Barbarian_World Tree", function (cls, lv, specs) {});

registerSubclassSheetActions("Barbarian_World Tree", [
  { name: "Branches of the Tree", cat: "reaction", minLevel: 6, inlinePills: saveDcPills("str") },
  { name: "Battering Roots", cat: "action", minLevel: 10 },
  { name: "Travel Along the Tree", cat: "bonus", minLevel: 14 },
]);

registerSubclassSheetEffects("Barbarian_World Tree", [

  { type: "tempHp", minLevel: 3, note: "Vitality of the Tree: grant Temporary HP while raging." },
  { type: "teleport", minLevel: 6, note: "Branches of the Tree: teleport a creature while raging." },
  { type: "reach", value: 10, minLevel: 10, note: "Battering Roots while raging." },
  { type: "teleport", minLevel: 14, note: "Travel Along the Tree." },
]);

}

