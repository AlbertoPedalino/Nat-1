import { createAdapterBindings } from '../adapterBindings.js';

export default function install(registry, context = {}) {
  const { registerFeatAdapter } = createAdapterBindings(registry, context);

  if (typeof registerFeatAdapter !== "function") return;

  registerFeatAdapter("Ability Score Improvement", function (feat) {
    return {
      ...feat,
      choiceUi: {
        ...(feat.choiceUi && typeof feat.choiceUi === "object" ? feat.choiceUi : {}),
        abilityScoreIncrease: { modes: ["double", "split"] }
      }
    };
  });

}

