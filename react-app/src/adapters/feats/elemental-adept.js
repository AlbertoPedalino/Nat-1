import { createAdapterBindings } from '../adapterBindings.js';

export default function install(registry, context = {}) {
  const { registerFeatAdapter, registerFeatSheetActions } = createAdapterBindings(registry, context);


  registerFeatAdapter("Elemental Adept", function (feat) {
    return {
      ...feat,
      choiceUi: {
        ...(feat.choiceUi && typeof feat.choiceUi === "object" ? feat.choiceUi : {}),
        damageType: {
          keySuffix: "damage_type",
          label: "Energy Mastery",
          options: [
            { value: "acid",      label: "Acid" },
            { value: "cold",      label: "Cold" },
            { value: "fire",      label: "Fire" },
            { value: "lightning", label: "Lightning" },
            { value: "thunder",   label: "Thunder" }
          ]
        }
      }
    };
  });

  registerFeatSheetActions("Elemental Adept", []);

}

