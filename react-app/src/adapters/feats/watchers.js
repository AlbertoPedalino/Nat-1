import { createAdapterBindings } from '../adapterBindings.js';
import { SPELL_ABILITY_CHOICE } from '../featAdapterHelpers.js';

export default function install(registry, context = {}) {
  const { registerFeatAdapter,  } = createAdapterBindings(registry, context);

  // Ravenloft Dark Gift. Beast Sense and Speak with Animals (each free 1/LR) are
  // granted from the feat JSON additionalSpells; the adapter adds the
  // spellcasting-ability choice. Heightened Suspicion and Incessant Watchers are
  // passive.
  registerFeatAdapter('Watchers', function (feat) {
    return {
      ...feat,
      choiceUi: {
        ...(feat.choiceUi && typeof feat.choiceUi === 'object' ? feat.choiceUi : {}),
        spellAbility: SPELL_ABILITY_CHOICE,
      },
    };
  });

}
