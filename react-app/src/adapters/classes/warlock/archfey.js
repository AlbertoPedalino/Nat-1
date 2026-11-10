import { createAdapterBindings } from '../../adapterBindings.js';

export default function install(registry, context = {}) {
  const {
    registerSubclassAdapter,
    registerSubclassSheetActions,
    registerSubclassSheetResources,
    registerSubclassSheetEffects,
    registerSubclassRuntimeConfig,
  } = createAdapterBindings(registry, context);
registerSubclassAdapter("Warlock_Archfey", function (cls, lv, specs) {});

registerSubclassSheetActions("Warlock_Archfey", [
  { name: "Steps of the Fey", cat: "bonus", resKey: "archfey_steps", minLevel: 3,
    rollers: [{ kind: 'tempHp', formula: "1d10" }] },
  { name: "Misty Escape", cat: "reaction", minLevel: 6,
    rollers: [{ kind: 'damage', formula: "2d10", label: "Fey Curse 2d10 Psychic" }] },
  { name: "Beguiling Defenses", cat: "reaction", resKey: "archfey_beguiling", minLevel: 10 },
  { name: "Bewitching Magic", cat: "action", minLevel: 14 },
]);

registerSubclassSheetEffects("Warlock_Archfey", [
  { type: "conditionImmunity", conditions: ["Charmed"], minLevel: 10, note: "Beguiling Defenses" },
]);
registerSubclassSheetResources("Warlock_Archfey", [
  { key: "archfey_steps",    name: "Steps of the Fey",    recharge: "LR",
    max: 'abilityMod:cha', minMax: 1 },
  { key: "archfey_beguiling", name: "Beguiling Defenses", recharge: "LR", max: () => 1 },
]);

}

