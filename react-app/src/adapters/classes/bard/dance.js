import { createAdapterBindings } from '../../adapterBindings.js';
import { isArmorOrShield } from '../../../shared/character/inventory/itemKinds.js';

export default function install(registry, context = {}) {
  const {
    registerSubclassAdapter, registerSubclassSheetActions, registerSubclassSheetEffects,
  } = createAdapterBindings(registry, context);
registerSubclassAdapter("Bard_Dance", function (cls, lv, specs) {});

registerSubclassSheetActions("Bard_Dance", [
  { name: "Agile Strikes",       cat: "attack",   minLevel: 3 },
  { name: "Inspiring Movement",  cat: "reaction", minLevel: 6 },
  { name: "Tandem Footwork",     cat: "bonus",    minLevel: 6 },
]);

// Dazzling Footwork (XPHB 2024), while wearing no armor and wielding no
// Shield: Unarmored Defense 10 + DEX + CHA, and Unarmed Strikes with DEX whose
// damage is the Bardic Inspiration die (d6, d8 at 5, d10 at 10, d12 at 15).
const unencumbered = (C) => !(C?.inventory || []).some((item) => (
  item?.equipped && isArmorOrShield(item)
));

registerSubclassSheetEffects("Bard_Dance", [

  { type: "acFormula", key: "bard_dance_dazzling_footwork", label: "Dazzling Footwork", base: 10, abilities: ["dex", "cha"], allowShield: false, requiresNoArmor: true, minLevel: 3 },
  ...[[3, 6], [5, 8], [10, 10], [15, 12]].map(([minLevel, face]) => (
    { type: "unarmedStrike", face, dexterity: true, minLevel, condition: unencumbered, note: "Dazzling Footwork" }
  )),
  // Tandem Footwork (L6) is conditional (expend Bardic Inspiration; bonus = die rolled),
  // not a passive modifier — covered by its feature action above, no sheet effect.
]);

}

