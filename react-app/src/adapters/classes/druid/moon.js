import { createAdapterBindings } from '../../adapterBindings.js';

export default function install(registry, context = {}) {
  const { registerSubclassAdapter, registerSubclassSheetActions, registerSubclassSheetResources } = createAdapterBindings(registry, context);
registerSubclassAdapter("Druid_Moon", function (cls, lv, specs) {});

registerSubclassSheetActions("Druid_Moon", [
  {
    "name": "Circle Forms",
    
    "cat": "bonus",
    
    "resKey": "wild_shape",
    "minLevel": 3
  },
  {
    "name": "Moonlight Step",
    
    "cat": "bonus",
    
    "resKey": "moon_moonlight_step",
    "minLevel": 10
  },
  {
    "name": "Lunar Form",
    
    "cat": "attack",
    
    "minLevel": 14,
    rollers: [{ kind: 'damage', formula: "2d10", label: ({ formula }) => `+${formula} radiant` }]
  }
]);
registerSubclassSheetResources("Druid_Moon", [
  {
    "key": "moon_moonlight_step",
    "name": "Moonlight Step",
    
    "recharge": "LR",
    "max": "abilityMod:wis", "minMax": 1
  }
]);

}

