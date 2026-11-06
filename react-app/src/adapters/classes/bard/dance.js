import { createAdapterBindings } from '../../adapterBindings.js';

export default function install(registry, context = {}) {
  const {
    registerSubclassAdapter, registerSubclassSheetActions, registerSubclassSheetEffects, registerSubclassRuntimeConfig,
  } = createAdapterBindings(registry, context);
registerSubclassAdapter("Bard_Dance", function (cls, lv, specs) {});

registerSubclassSheetActions("Bard_Dance", [
  { name: "Agile Strikes",       icon: "", cat: "attack",   uses: "With Bardic Insp.",  minLevel: 3 },
  { name: "Inspiring Movement",  icon: "", cat: "reaction", uses: "With Bardic Insp.",  minLevel: 6 },
  { name: "Tandem Footwork",     icon: "", cat: "bonus",    uses: "With Bardic Insp.",  minLevel: 6 },
]);

registerSubclassSheetEffects("Bard_Dance", [

  { type: "unarmedStrikeDamage", value: "Bardic Inspiration die", minLevel: 3, note: "Dazzling Footwork." },
  // Tandem Footwork (L6) is conditional (expend Bardic Inspiration; bonus = die rolled),
  // not a passive modifier — covered by its feature action above, no sheet effect.
  { type: "evasion", minLevel: 14, note: "Evasion." },
]);

registerSubclassRuntimeConfig("Bard_Dance", {
  unarmoredDefense: [{ name: "Dance of the Wind", base: 10, abilities: ["dex", "cha"], allowShield: false, minLevel: 3 }],
  unarmedStrike: {
    minLevel: 3,
    requiresNoArmor: true,
    requiresNoShield: true,
    attackAbility: "dex",
    damage: {
      kind: "featureDie",
      className: "Bard",
      feature: "bardicInspiration",
      ability: "dex",
      label: "Bardic Damage (Unarmed)",
    },
    badge: "Bardic Damage",
  },
});

}

