import { createAdapterBindings } from '../adapterBindings.js';

export default function install(registry, context = {}) {
  const { registerFeatSheetActions, registerFeatSheetResources } = createAdapterBindings(registry, context);


  registerFeatSheetResources("Chef", [
    {
      key: "chef_treats",
      name: "Bolstering Treats",
      
      recharge: "LR",
      max: 'proficiencyBonus'
    }
  ]);

  registerFeatSheetActions("Chef", [
    {
      name: "Replenishing Meal",
      
      cat: "action",
      
    },
    {
      name: "Bolstering Treats",
      
      cat: "action",
      resKey: "chef_treats",
      
    }
  ]);

}

