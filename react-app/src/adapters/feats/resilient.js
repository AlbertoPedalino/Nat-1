import { createAdapterBindings } from '../adapterBindings.js';

export default function install(registry, context = {}) {
  const { registerFeatAdapter } = createAdapterBindings(registry, context);


  if (typeof registerFeatAdapter !== "function") return;

  registerFeatAdapter("Resilient", function (feat) {
    return {
      ...feat,
      choiceUi: {
        ...(feat.choiceUi && typeof feat.choiceUi === "object" ? feat.choiceUi : {}),
        saveProficiency: {
          keySuffix: "save_prof",
          label: "Saving Throw Proficiency",
          options: [
            { value: "str", label: "Strength" },
            { value: "dex", label: "Dexterity" },
            { value: "con", label: "Constitution" },
            { value: "int", label: "Intelligence" },
            { value: "wis", label: "Wisdom" },
            { value: "cha", label: "Charisma" }
          ]
        }
      }
    };
  });

}

