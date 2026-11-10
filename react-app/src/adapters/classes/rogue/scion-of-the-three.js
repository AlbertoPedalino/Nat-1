import { createAdapterBindings } from '../../adapterBindings.js';

export default function install(registry, context = {}) {
  const { registerSubclassAdapter, registerSubclassSheetActions, registerSubclassSheetResources } = createAdapterBindings(registry, context);
registerSubclassAdapter("Rogue_Scion of the Three", function (cls, lv, specs) {
  if (lv >= 3) {
    specs.push({
      key: 'subclass_scion_allegiance',
      label: 'Dread Allegiance (God Choice)',
      type: 'generic_choice',
      from: ['Bane', 'Bhaal', 'Myrkul'],
      count: 1,
      level: 3
    });
  }
});

registerSubclassSheetActions("Rogue_Scion of the Three", [
  {
    "name": "Bloodthirst",
    
    "cat": "reaction",
    
    "resKey": "scion_bloodthirst",
    "minLevel": 3
  },
  {
    "name": "Strike Fear",
    
    "cat": "action",
    
    "minLevel": 9
  }
]);
registerSubclassSheetResources("Rogue_Scion of the Three", [
  {
    "key": "scion_bloodthirst",
    "name": "Bloodthirst",
    
    "recharge": "LR",
    "max": "abilityMod:int", "minMax": 1
  }
]);

}

