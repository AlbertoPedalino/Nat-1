import { createAdapterBindings } from '../adapterBindings.js';
import { SPELL_ABILITY_CHOICE } from '../featAdapterHelpers.js';

export default function install(registry, context = {}) {
  const { registerFeatAdapter,  } = createAdapterBindings(registry, context);

  // Ravenloft Dark Gift. Alter Self (free 1/LR, no Concentration when cast this
  // way) is granted from the feat JSON additionalSpells; the adapter adds the
  // spellcasting-ability choice. Involuntary Change is a passive reminder.
  registerFeatAdapter('Second Skin', function (feat) {
    return {
      ...feat,
      choiceUi: {
        ...(feat.choiceUi && typeof feat.choiceUi === 'object' ? feat.choiceUi : {}),
        spellAbility: SPELL_ABILITY_CHOICE,
      },
      spellGrantOverrides: {
        'Alter Self': {
          freeCast: { canAlsoUseSlots: true },
          modifiers: [{
            key: 'second-skin-no-concentration',
            tagLabel: 'Free Cast',
            detailTitle: 'Alternate Form',
            detailText: 'When cast without a spell slot through Second Skin, Alter Self requires no spell components or Concentration.',
          }],
        },
      },
    };
  });

}
