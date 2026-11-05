import { createAdapterBindings } from '../../adapterBindings.js';

export default function install(registry, context = {}) {
  const { registerSubclassAdapter, registerSubclassSheetActions, registerSubclassSheetEffects } = createAdapterBindings(registry, context);
registerSubclassAdapter("Bard_Dance", function (cls, lv, specs) {});

// [SheetRuntime] START
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
// [SheetRuntime] END

}

