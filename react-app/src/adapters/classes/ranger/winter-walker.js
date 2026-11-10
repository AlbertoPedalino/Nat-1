import { createAdapterBindings } from '../../adapterBindings.js';

export default function install(registry, context = {}) {
  const { registerSubclassAdapter, registerSubclassSheetActions, registerSubclassSheetResources } = createAdapterBindings(registry, context);
registerSubclassAdapter("Ranger_Winter Walker", function (cls, lv, specs) {});

registerSubclassSheetActions("Ranger_Winter Walker", [
  {
    "name": "Fortifying Soul",
    
    "cat": "action",
    
    "resKey": "winter_walker_fortify",
    "minLevel": 7
  },
  {
    "name": "Chilling Retribution",
    
    "cat": "reaction",
    
    "resKey": "winter_walker_retribution",
    "minLevel": 11
  },
  {
    "name": "Frozen Haunt",
    
    "cat": "action",
    
    "resKey": "winter_walker_haunt",
    "minLevel": 15
  }
]);
registerSubclassSheetResources("Ranger_Winter Walker", [
  {
    "key": "winter_walker_fortify",
    "name": "Fortifying Soul",
    
    "recharge": "LR",
    "max": () => 1
  },
  {
    "key": "winter_walker_retribution",
    "name": "Chilling Retribution",
    
    "recharge": "LR",
    "max": "abilityMod:wis", "minMax": 1
  },
  {
    "key": "winter_walker_haunt",
    "name": "Frozen Haunt",
    
    "recharge": "LR",
    "max": () => 1
  }
]);

}

