import { createAdapterBindings } from '../adapterBindings.js';

export default function install(registry, context = {}) {
  const { registerFeatAdapter } = createAdapterBindings(registry, context);

  // Minor Telekinesis: Mage Hand comes from the feat's additionalSpells (Spells
  // tab), cast without Verbal/Somatic components and with +30 ft range (60 ft).
  // No spellAbility choice: the 2024 feat casts with the ability it increased
  // (additionalSpells ability "inherit" → the slot's `_asi` choice).
  registerFeatAdapter("Telekinetic", function (feat) {
    return {
      ...feat,
      spellGrantOverrides: {
        "Mage Hand": {
          spell: { removeComponents: ["v", "s"], rangeLabel: "60 feet" }
        }
      }
    };
  });
}
