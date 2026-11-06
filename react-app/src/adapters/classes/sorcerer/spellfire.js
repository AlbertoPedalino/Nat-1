import { createAdapterBindings } from '../../adapterBindings.js';

export default function install(registry, context = {}) {
  const {
    registerSubclassAdapter,
    registerSubclassSheetActions,
    registerSubclassSheetResources,
    registerSubclassRuntimeConfig,
  } = createAdapterBindings(registry, context);
registerSubclassAdapter("Sorcerer_Spellfire", function (cls, lv, specs) {});

registerSubclassSheetActions("Sorcerer_Spellfire", [
  {
    "name": "Spellfire Burst",
    "icon": "",
    "cat": "action",
    "uses": "Once / turn (on SP spend)",
    "minLevel": 3
  },
  {
    "name": "Crown of Spellfire",
    "icon": "",
    "cat": "action",
    "uses": "1 / LR",
    "resKey": "crown_of_spellfire",
    "minLevel": 18
  }
]);
registerSubclassSheetResources("Sorcerer_Spellfire", [
  {
    "key": "crown_of_spellfire",
    "name": "Crown of Spellfire",
    "icon": "flame",
    "recharge": "LR",
    "max": () => 1
  }
]);
registerSubclassRuntimeConfig("Sorcerer_Spellfire", {
  spellcasting: {
    alwaysPreparedSpells: [
      { name: "Counterspell", minLevel: 6, level: 3 },
    ],
  },
});

}

