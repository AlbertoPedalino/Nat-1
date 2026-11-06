import { createAdapterBindings } from '../../adapterBindings.js';

export default function install(registry, context = {}) {
  const {
    registerSubclassAdapter,
    registerSubclassSheetActions,
    registerSubclassSheetResources,
    registerSubclassSheetEffects,
    registerSubclassRuntimeConfig,
  } = createAdapterBindings(registry, context);
registerSubclassAdapter("Paladin_Glory", function (cls, lv, specs) {});

registerSubclassSheetActions("Paladin_Glory", [
  { name: "Inspiring Smite", icon: "", cat: "bonus", uses: "1 Channel", resKey: "paladin_channel_div" },
  { name: "Peerless Athlete", icon: "", cat: "bonus", uses: "1 Channel", resKey: "paladin_channel_div" },
  { name: "Glorious Defense", icon: "", cat: "reaction", uses: "CHA mod / LR", resKey: "glory_glorious_defense", minLevel: 15 },
  { name: "Living Legend", icon: "", cat: "bonus", uses: "1 / LR or lv5 slot", resKey: "glory_living_legend", minLevel: 20 },
]);
registerSubclassSheetResources("Paladin_Glory", [
  { key: "glory_glorious_defense", name: "Glorious Defense", icon: "shield", recharge: "LR",
    max: (lv, { cha } = {}) => Math.max(1, cha ?? 0) },
  { key: "glory_living_legend", name: "Living Legend", icon: "crown", recharge: "LR", max: () => 1 },
]);

registerSubclassRuntimeConfig("Paladin_Glory", {
  spellcasting: {
    alwaysPreparedSpells: [
      { name: "Guiding Bolt", minLevel: 3, level: 1 },
      { name: "Heroism", minLevel: 3, level: 1 },
      { name: "Enhance Ability", minLevel: 5, level: 2 },
      { name: "Magic Weapon", minLevel: 5, level: 2 },
      { name: "Haste", minLevel: 9, level: 3 },
      { name: "Protection from Energy", minLevel: 9, level: 3 },
      { name: "Compulsion", minLevel: 13, level: 4 },
      { name: "Freedom of Movement", minLevel: 13, level: 4 },
      { name: "Legend Lore", minLevel: 17, level: 5 },
      { name: "Yolande's Regal Presence", minLevel: 17, level: 5 }
    ],
  },
});

registerSubclassSheetEffects("Paladin_Glory", [

  { type: "speed", value: 10, minLevel: 7, note: "Aura of Alacrity: your Speed increases by 10 ft; allies in aura gain +10 ft until end of their next turn." },

]);

}

