import { createAdapterBindings } from '../adapterBindings.js';
import { SPELL_ABILITY_CHOICE } from '../featAdapterHelpers.js';

export default function install(registry, context = {}) {
  const { registerFeatAdapter,  } = createAdapterBindings(registry, context);


  registerFeatAdapter("Spell Sniper", function (feat) {
    return {
      ...feat,
      choiceUi: {
        ...(feat.choiceUi && typeof feat.choiceUi === "object" ? feat.choiceUi : {}),
        spellAbility: SPELL_ABILITY_CHOICE
      }
    };
  });


}

