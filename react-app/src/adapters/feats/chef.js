import { createAdapterBindings } from '../adapterBindings.js';

export default function install(registry, context = {}) {
  const { registerFeatSheetActions, registerFeatSheetResources } = createAdapterBindings(registry, context);


  if (typeof registerFeatSheetResources === "function") {
    registerFeatSheetResources("Chef", [
      {
        key: "chef_treats",
        name: "Bolstering Treats",
        icon: "chef-hat",
        recharge: "LR",
        max: 'proficiencyBonus'
      }
    ]);
  }

  if (typeof registerFeatSheetActions === "function") {
    registerFeatSheetActions("Chef", [
      {
        name: "Replenishing Meal",
        icon: "chef-hat",
        cat: "action",
        uses: "Short Rest"
      },
      {
        name: "Bolstering Treats",
        icon: "chef-hat",
        cat: "action",
        resKey: "chef_treats",
        uses: "Bonus Action"
      }
    ]);
  }

}

