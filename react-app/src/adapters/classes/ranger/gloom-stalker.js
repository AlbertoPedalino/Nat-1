import { createAdapterBindings } from '../../adapterBindings.js';

export default function install(registry, context = {}) {
  const {
    registerSubclassAdapter,
    registerSubclassSheetActions,
    registerSubclassSheetResources,
    registerSubclassSheetEffects,
    registerSubclassRuntimeConfig,
  } = createAdapterBindings(registry, context);
registerSubclassAdapter("Ranger_Gloom Stalker", function (cls, lv, specs) {});

registerSubclassSheetActions("Ranger_Gloom Stalker", [
  {
    "name": "Dread Ambusher",
    "cat": "attack",
    "resKey": "dread_ambusher",
    "minLevel": 3,
    rollers: [{ kind: 'damage', formula: ({ ownerLevel }) => Number(ownerLevel || 1) >= 11 ? "2d8" : "2d6", label: ({ formula }) => `+${formula} psychic` }]
  },
  {
    "name": "Shadowy Dodge",
    "cat": "reaction",
    "minLevel": 15
  }
]);
registerSubclassSheetResources("Ranger_Gloom Stalker", [
  {
    "key": "dread_ambusher",
    "name": "Dread Ambusher",
    "recharge": "LR",
    "max": "abilityMod:wis", "minMax": 1
  }
]);

registerSubclassRuntimeConfig("Ranger_Gloom Stalker", {
  spellcasting: {
    alwaysPreparedSpells: [
      { name: "Disguise Self", minLevel: 3, level: 1 },
      { name: "Rope Trick", minLevel: 5, level: 2 },
      { name: "Fear", minLevel: 9, level: 3 },
      { name: "Greater Invisibility", minLevel: 13, level: 4 },
      { name: "Seeming", minLevel: 17, level: 5 }
    ],
  },
});

registerSubclassSheetEffects("Ranger_Gloom Stalker", [

  { type: "sense", senseType: "darkvision", value: 60, additive: true, minLevel: 3, note: "Umbral Sight: gain Darkvision 60 ft or +60 ft if you already have it." },
  { type: "initiativeAbilityMod", ability: "wis", minLevel: 3, note: "Dread Ambusher." },
  { type: "saveProficiency", ability: "wis", minLevel: 7, note: "Iron Mind: if already proficient, choose INT or CHA instead." },

]);

}

