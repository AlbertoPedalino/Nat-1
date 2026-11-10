import { createAdapterBindings } from '../../adapterBindings.js';

export default function install(registry, context = {}) {
  const {
    registerSubclassAdapter,
    registerSubclassSheetActions,
    registerSubclassSheetResources,
    registerSubclassSheetEffects,
    registerSubclassRuntimeConfig,
  } = createAdapterBindings(registry, context);
registerSubclassAdapter("Paladin_Ancients", function (cls, lv, specs) {});

registerSubclassSheetActions("Paladin_Ancients", [
  { name: "Nature's Wrath", cat: "action", resKey: "paladin_channel_div" },
  { name: "Undying Sentinel", cat: "action", resKey: "ancients_undying_sentinel", minLevel: 15 },
  { name: "Elder Champion", cat: "bonus", resKey: "ancients_elder_champion", minLevel: 20 },
]);
registerSubclassSheetResources("Paladin_Ancients", [
  { key: "ancients_undying_sentinel", name: "Undying Sentinel", recharge: "LR", max: () => 1 },
  { key: "ancients_elder_champion",   name: "Elder Champion",   recharge: "LR", max: () => 1 },
]);

registerSubclassSheetEffects("Paladin_Ancients", [

  { type: "resistance", damageTypes: ["Necrotic", "Psychic", "Radiant"], minLevel: 7, note: "Aura of Warding: applies while in Aura of Protection." },

]);

}

