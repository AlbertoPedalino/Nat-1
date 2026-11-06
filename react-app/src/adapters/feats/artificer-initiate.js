import { createAdapterBindings } from '../adapterBindings.js';

export default function install(registry, context = {}) {
  const { registerFeatAdapter,  } = createAdapterBindings(registry, context);


  registerFeatAdapter("Artificer Initiate", function (feat) {
    return {
      ...feat,
      choiceUi: {
        ...(feat.choiceUi && typeof feat.choiceUi === "object" ? feat.choiceUi : {}),
        spellAbility: {
          keySuffix: "spell_ability",
          label: "Spellcasting Ability",
          options: [
            { value: "int", label: "Intelligence" }
          ]
        }
      }
    };
  });


}

