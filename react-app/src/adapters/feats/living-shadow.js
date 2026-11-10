import { createAdapterBindings } from '../adapterBindings.js';

export default function install(registry, context = {}) {
  const { registerFeatAdapter, registerFeatSheetActions, registerFeatSheetResources } = createAdapterBindings(registry, context);

  // Ravenloft Dark Gift. Mage Hand (no components) is granted from the feat JSON;
  // the adapter wires Lengthened Strike.
  registerFeatAdapter('Living Shadow', function (feat) {
    return {
      ...feat,
      spellGrantOverrides: {
        'Mage Hand': {
          spell: { components: 'none' },
        },
      },
    };
  });

  registerFeatSheetActions('Living Shadow', [
    {
      name: 'Lengthened Strike',
      
      cat: 'special',
      
      resKey: 'living_shadow_reach',
    },
  ]);

  registerFeatSheetResources('Living Shadow', [
    {
      key: 'living_shadow_reach',
      name: 'Lengthened Strike',
      
      recharge: 'LR',
      max: 'proficiencyBonus',
    },
  ]);
}
