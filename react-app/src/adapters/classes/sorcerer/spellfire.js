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
    
    "cat": "action",
    
    "minLevel": 3
  },
  {
    "name": "Crown of Spellfire",
    
    "cat": "action",
    
    "resKey": "crown_of_spellfire",
    "minLevel": 18
  }
]);
registerSubclassSheetResources("Sorcerer_Spellfire", [
  {
    "key": "crown_of_spellfire",
    "name": "Crown of Spellfire",
    
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

