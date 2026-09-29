import { createAdapterBindings } from '../adapterBindings.js';

export default function install(registry, context = {}) {
  const { registerFeatAdapter, registerFeatSheetActions } = createAdapterBindings(registry, context);

  // Minor Telekinesis: Mage Hand comes from the feat's additionalSpells (Spells
  // tab), cast without Verbal/Somatic components and with +30 ft range (60 ft).
  // No spellAbility choice: the 2024 feat casts with the ability it increased
  // (additionalSpells ability "inherit" → the slot's `_asi` choice).
  if (typeof registerFeatAdapter === "function") {
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

  // Card text = the feat's official "Telekinetic Shove" benefit only (entryName).
  if (typeof registerFeatSheetActions === "function") {
    registerFeatSheetActions("Telekinetic", [
      {
        name: "Telekinetic Shove",
        entryName: "Telekinetic Shove",
        icon: "hand",
        cat: "bonus",
        uses: "Bonus Action",
        desc: "Shove one creature you can see within 30 feet: Strength save (DC 8 + the increased ability's modifier + PB) or be moved 5 feet toward or away from you."
      }
    ]);
  }
}
