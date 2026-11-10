import { createAdapterBindings } from '../../adapterBindings.js';

export default function install(registry, context = {}) {
  const {
    registerSubclassAdapter,
    registerSubclassSheetActions,
    registerSubclassSheetResources,
    registerSubclassSheetEffects,
    registerSubclassRuntimeConfig,
    registerSubclassSheetProficiencies,
  } = createAdapterBindings(registry, context);
// War Domain (XPHB): tutte le feature sono passive o azioni fisse, nessuna scelta di build.
// L3: War Priest, Guided Strike (CD)
// L6: War God's Blessing (CD)
// L17: Avatar of Battle (resistenze B/P/S)
// War Domain grants Heavy Armor and Martial Weapon proficiency
registerSubclassSheetProficiencies("Cleric_War", [
  { type: "armor", values: ["Heavy"], minLevel: 3 },
  { type: "weapon", values: ["Martial"], minLevel: 3 },
]);

registerSubclassAdapter("Cleric_War", function (cls, lv, specs) {
  // nessuna spec
});

registerSubclassSheetActions("Cleric_War", [
  { name: "War Priest", icon: "", cat: "bonus", uses: "WIS mod / SR+LR", resKey: "war_priest", minLevel: 3 },
  { name: "Guided Strike", icon: "", cat: "reaction", uses: "1 Channel", resKey: "channel_div", minLevel: 3 },
  { name: "War God's Blessing", icon: "", cat: "reaction", uses: "1 Channel", resKey: "channel_div", minLevel: 6 },
]);
registerSubclassSheetResources("Cleric_War", [
  { key: "war_priest", name: "War Priest", icon: "swords", recharge: "SR+LR",
    max: 'abilityMod:wis', minMax: 1 },
]);
registerSubclassRuntimeConfig("Cleric_War", {
  spellcasting: {
    alwaysPreparedSpells: [
      { name: "Guiding Bolt", minLevel: 3, level: 1 },
      { name: "Magic Weapon", minLevel: 3, level: 2 },
      { name: "Shield of Faith", minLevel: 3, level: 1 },
      { name: "Spiritual Weapon", minLevel: 3, level: 2 },
      { name: "Crusader's Mantle", minLevel: 5, level: 3 },
      { name: "Spirit Guardians", minLevel: 5, level: 3 },
      { name: "Fire Shield", minLevel: 7, level: 4 },
      { name: "Freedom of Movement", minLevel: 7, level: 4 },
      { name: "Hold Monster", minLevel: 9, level: 5 },
      { name: "Steel Wind Strike", minLevel: 9, level: 5 },
    ],
  },
});

registerSubclassSheetEffects("Cleric_War", [
  { type: "attackBonus", value: 10, minLevel: 3, note: "Guided Strike: add +10 to a missed attack roll using Channel Divinity." },
  { type: "resistance", damageTypes: ["Bludgeoning", "Piercing", "Slashing"], minLevel: 17, note: "Avatar of Battle." },
]);

}

