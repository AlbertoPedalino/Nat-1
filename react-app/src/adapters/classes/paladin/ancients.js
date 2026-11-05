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

// [SheetRuntime] START
registerSubclassSheetActions("Paladin_Ancients", [
  { name: "Nature's Wrath", icon: "", cat: "action", uses: "1 Channel", resKey: "paladin_channel_div" },
  { name: "Undying Sentinel", icon: "", cat: "action", uses: "1 / LR", resKey: "ancients_undying_sentinel", minLevel: 15 },
  { name: "Elder Champion", icon: "", cat: "bonus", uses: "1 / LR or lv5 slot", resKey: "ancients_elder_champion", minLevel: 20 },
]);
registerSubclassSheetResources("Paladin_Ancients", [
  { key: "ancients_undying_sentinel", name: "Undying Sentinel", icon: "shield", recharge: "LR", max: () => 1 },
  { key: "ancients_elder_champion",   name: "Elder Champion",   icon: "leaf",   recharge: "LR", max: () => 1 },
]);

if (typeof registerSubclassRuntimeConfig === "function") {
  registerSubclassRuntimeConfig("Paladin_Ancients", {
    spellcasting: {
      alwaysPreparedSpells: [
        { name: "Ensnaring Strike", minLevel: 3, level: 1 },
        { name: "Speak with Animals", minLevel: 3, level: 1 },
        { name: "Misty Step", minLevel: 5, level: 2 },
        { name: "Moonbeam", minLevel: 5, level: 2 },
        { name: "Plant Growth", minLevel: 9, level: 3 },
        { name: "Protection from Energy", minLevel: 9, level: 3 },
        { name: "Ice Storm", minLevel: 13, level: 4 },
        { name: "Stoneskin", minLevel: 13, level: 4 },
        { name: "Commune with Nature", minLevel: 17, level: 5 },
        { name: "Tree Stride", minLevel: 17, level: 5 }
      ],
    },
  });
}

registerSubclassSheetEffects("Paladin_Ancients", [

  { type: "resistance", damageTypes: ["Necrotic", "Psychic", "Radiant"], minLevel: 7, note: "Aura of Warding: applies while in Aura of Protection." },

]);
// [SheetRuntime] END

}

