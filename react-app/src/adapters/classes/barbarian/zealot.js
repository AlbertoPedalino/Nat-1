import { createAdapterBindings } from '../../adapterBindings.js';

export default function install(registry, context = {}) {
  const {
    registerSubclassAdapter,
    registerSubclassSheetActions,
    registerSubclassSheetResources,
    registerSubclassSheetEffects,
  } = createAdapterBindings(registry, context);
registerSubclassAdapter("Barbarian_Zealot", function (cls, lv, specs) {});

registerSubclassSheetActions("Barbarian_Zealot", [
  { name: "Warrior of the Gods", cat: "bonus", resKey: "zealot_warrior_pool", minLevel: 3 },
  { name: "Fanatical Focus", cat: "reaction", minLevel: 6 },
  { name: "Zealous Presence", cat: "bonus", resKey: "zealous_presence", minLevel: 10 },
  { name: "Rage of the Gods", cat: "action", resKey: "zealot_rage_gods", minLevel: 14 },
]);
registerSubclassSheetResources("Barbarian_Zealot", [
  { key: "zealot_warrior_pool", name: "Warrior of the Gods", recharge: "LR",
    max: (lv) => lv >= 17 ? 7 : lv >= 12 ? 6 : lv >= 6 ? 5 : 4,
    pool: true, track: "used" },
  { key: "zealous_presence",    name: "Zealous Presence",   recharge: "LR", max: () => 1 },
  { key: "zealot_rage_gods",    name: "Rage of the Gods",   recharge: "LR", max: () => 1 },
]);

registerSubclassSheetEffects("Barbarian_Zealot", [

  { type: "speed", speedType: "fly", value: "walking", situational: true, minLevel: 14, note: "Rage of the Gods: fly speed and resistance-related benefits while raging." },
]);

}

