import { createAdapterBindings } from '../../adapterBindings.js';

export default function install(registry, context = {}) {
  const {
    registerSubclassAdapter,
    registerSubclassSheetEffects,
    registerSubclassSheetProficiencies,
  } = createAdapterBindings(registry, context);
registerSubclassAdapter("Rogue_Assassin", function (cls, lv, specs) {});

registerSubclassSheetProficiencies("Rogue_Assassin", [
  { type: "tool", values: ["Disguise Kit", "Poisoner's Kit"], minLevel: 3 }
]);

registerSubclassSheetEffects("Rogue_Assassin", [

  { type: "advantage", target: "initiative", minLevel: 3, note: "Assassinate." },
  { type: "toolProficiency", values: ["Disguise Kit", "Poisoner's Kit"], minLevel: 3, note: "Assassin's Tools." },

]);

}

