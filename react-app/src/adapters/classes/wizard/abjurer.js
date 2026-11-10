import { createAdapterBindings } from '../../adapterBindings.js';
import { addWizardSavantSpellChoices } from '../../classAdapterHelpers.js';

export default function install(registry, context = {}) {
  const {
    registerSubclassAdapter,
    registerSubclassSheetActions,
    registerSubclassSheetResources,
    registerSubclassSheetEffects,
    registerSubclassRuntimeConfig,
  } = createAdapterBindings(registry, context);
registerSubclassAdapter("Wizard_Abjurer", function (cls, lv, specs) {
  addWizardSavantSpellChoices(specs, lv, { key: "abjurer", label: "Abjuration", school: "A" });
});

registerSubclassSheetActions("Wizard_Abjurer", [
  { name: "Arcane Ward", icon: "", cat: "action", uses: "Ward HP", resKey: "arcane_ward", minLevel: 3 },
  { name: "Projected Ward", icon: "", cat: "reaction", uses: "Reaction", minLevel: 6 },
]);
registerSubclassSheetResources("Wizard_Abjurer", [
  { key: "arcane_ward", name: "Arcane Ward", icon: "shield", recharge: "LR",
    max: (lv, { int } = {}) => Math.max(1, (Number(lv) || 0) * 2 + (int ?? 0)) },
]);
registerSubclassRuntimeConfig("Wizard_Abjurer", {
  spellcasting: {
    alwaysPreparedSpells: [
      { name: "Counterspell", minLevel: 10 },
      { name: "Dispel Magic", minLevel: 10 },
    ],
  },
});

registerSubclassSheetEffects("Wizard_Abjurer", [

  { type: "advantage", target: "save", source: "spells", minLevel: 14, note: "Spell Resistance." },
]);

}

