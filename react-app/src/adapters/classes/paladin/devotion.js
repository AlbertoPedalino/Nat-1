import { createAdapterBindings } from '../../adapterBindings.js';

export default function install(registry, context = {}) {
  const {
    registerSubclassAdapter,
    registerSubclassSheetActions,
    registerSubclassSheetResources,
    registerSubclassSheetEffects,
    registerSubclassRuntimeConfig,
  } = createAdapterBindings(registry, context);
registerSubclassAdapter("Paladin_Devotion", function (cls, lv, specs) {});

registerSubclassSheetActions("Paladin_Devotion", [
  { name: "Sacred Weapon", cat: "action", resKey: "paladin_channel_div" },
  { name: "Holy Nimbus", cat: "bonus", resKey: "devotion_holy_nimbus", minLevel: 20 },
]);
registerSubclassSheetResources("Paladin_Devotion", [
  { key: "devotion_holy_nimbus", name: "Holy Nimbus", recharge: "LR", max: () => 1 },
]);

}

