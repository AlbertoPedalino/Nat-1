import { createAdapterBindings } from '../../adapterBindings.js';

export default function install(registry, context = {}) {
  const {
    registerSubclassAdapter,
    registerSubclassSheetActions,
    registerSubclassSheetEffects,
    registerSubclassSheetProficiencies,
  } = createAdapterBindings(registry, context);
registerSubclassAdapter("Bard_Valor", function (cls, lv, specs) {});

registerSubclassSheetActions("Bard_Valor", [
  { name: "Combat Inspiration", cat: "reaction", minLevel: 3 },
  { name: "Battle Magic",       cat: "bonus",    minLevel: 14 },
]);

registerSubclassSheetProficiencies("Bard_Valor", [
  { type: "armor", values: ["Medium", "Shield"], minLevel: 3 },
  { type: "weapon", values: ["Martial"], minLevel: 3 },
]);


}

