import { createAdapterBindings } from '../adapterBindings.js';

export default function install(registry, context = {}) {
  const { registerFeatSheetActions, registerFeatSheetResources } = createAdapterBindings(registry, context);


  if (typeof registerFeatSheetResources === "function") {
    registerFeatSheetResources("Lucky", [
      {
        key:      'lucky_points',
        name:     'Lucky',
        icon:     'clover',
        recharge: 'LR',
        max:      'proficiencyBonus', // XPHB 2024: Luck Points = Proficiency Bonus
      },
    ]);
  }

  if (typeof registerFeatSheetActions === "function") {
    registerFeatSheetActions("Lucky", [
      {
        name:   'Lucky',
        icon:   'clover',
        cat:    'special',
        uses:   'PB / Long Rest',
        resKey: 'lucky_points',
      },
    ]);
  }


}

