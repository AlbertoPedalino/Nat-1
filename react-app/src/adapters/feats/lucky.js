import { createAdapterBindings } from '../adapterBindings.js';

export default function install(registry, context = {}) {
  const { registerFeatSheetActions, registerFeatSheetResources } = createAdapterBindings(registry, context);


  registerFeatSheetResources("Lucky", [
    {
      key:      'lucky_points',
      name:     'Lucky',
      
      recharge: 'LR',
      max:      'proficiencyBonus', // XPHB 2024: Luck Points = Proficiency Bonus
    },
  ]);

  registerFeatSheetActions("Lucky", [
    {
      name:   'Lucky',
      
      cat:    'special',
      
      resKey: 'lucky_points',
    },
  ]);


}

