import { createAdapterBindings } from '../adapterBindings.js';
import { SPELL_ABILITY_CHOICE } from '../featAdapterHelpers.js';

export default function install(registry, context = {}) {
  const { registerFeatAdapter, registerFeatSheetActions, registerFeatSheetResources } = createAdapterBindings(registry, context);

  // Ravenloft Dark Gift. Mage Hand (no components) is granted from the feat JSON;
  // the adapter adds the spellcasting-ability choice and wires Lengthened Strike.
  registerFeatAdapter('Living Shadow', function (feat) {
    return {
      ...feat,
      choiceUi: {
        ...(feat.choiceUi && typeof feat.choiceUi === 'object' ? feat.choiceUi : {}),
        spellAbility: SPELL_ABILITY_CHOICE,
      },
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
