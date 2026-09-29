import { createAdapterBindings } from '../adapterBindings.js';

export default function install(registry, context = {}) {
  const { registerFeatSheetEffects } = createAdapterBindings(registry, context);

  // Detect Thoughts (1/LR free cast, also with slots) comes from the feat's
  // additionalSpells in the Spells tab — no separate resource or action card.
  // No spellAbility choice: the 2024 feat casts with the ability it increased
  // (additionalSpells ability "inherit" → the slot's `_asi` choice).

  // Telepathic Utterance: telepathy 60 ft, shown under Senses.
  if (typeof registerFeatSheetEffects === "function") {
    registerFeatSheetEffects("Telepathic", [
      { type: "sense", senseType: "telepathy", value: 60, note: "Telepathic" }
    ]);
  }
}
