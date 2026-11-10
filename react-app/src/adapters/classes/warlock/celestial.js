import { createAdapterBindings } from '../../adapterBindings.js';

export default function install(registry, context = {}) {
  const {
    registerSubclassAdapter,
    registerSubclassSheetActions,
    registerSubclassSheetResources,
    registerSubclassSheetEffects,
    registerSubclassRuntimeConfig,
  } = createAdapterBindings(registry, context);
registerSubclassAdapter("Warlock_Celestial", function (cls, lv, specs) {});

registerSubclassSheetActions("Warlock_Celestial", [
  { name: "Healing Light", cat: "bonus", resKey: "celestial_heal_light", minLevel: 3,
    rollers: [{ kind: 'heal', formula: "1d6" }] },
  { name: "Celestial Resilience", cat: "action", minLevel: 10 },
  { name: "Searing Vengeance", cat: "reaction", resKey: "celestial_searing_ven", minLevel: 14,
    rollers: [{ kind: 'damage', formula: "2d8", label: "Searing Vengeance 2d8 Radiant" }] },
]);

registerSubclassSheetEffects("Warlock_Celestial", [
  { type: "resistance", damageTypes: ["Radiant"], minLevel: 6, note: "Radiant Soul" },
]);
registerSubclassSheetResources("Warlock_Celestial", [
  { key: "celestial_heal_light", name: "Healing Light", recharge: "LR",
    max: (lv) => 1 + lv,
    pool: true, track: "used" },
  { key: "celestial_searing_ven", name: "Searing Vengeance", recharge: "LR", max: () => 1 },
]);

}

