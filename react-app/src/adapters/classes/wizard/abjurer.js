import { createAdapterBindings } from '../../adapterBindings.js';

export default function install(registry, context = {}) {
  const {
    registerSubclassAdapter,
    registerSubclassSheetActions,
    registerSubclassSheetResources,
    registerSubclassSheetEffects,
    registerSubclassRuntimeConfig,
  } = createAdapterBindings(registry, context);
registerSubclassAdapter("Wizard_Abjurer", function (cls, lv, specs) {
  if (typeof addWizardSavantSpellChoices === "function") {
    addWizardSavantSpellChoices(specs, lv, { key: "abjurer", label: "Abjuration", school: "A" });
  }
});

// [SheetRuntime] START
registerSubclassSheetActions("Wizard_Abjurer", [
  { name: "Arcane Ward", icon: "", cat: "action", uses: "Ward HP", resKey: "arcane_ward", minLevel: 3 },
  { name: "Projected Ward", icon: "", cat: "reaction", uses: "Reaction", minLevel: 6 },
]);
registerSubclassSheetResources("Wizard_Abjurer", [
  { key: "arcane_ward", name: "Arcane Ward", icon: "shield", recharge: "LR",
    max: (lv, { int } = {}) => Math.max(1, (Number(lv) || 0) * 2 + (int ?? 0)) },
]);
if (typeof registerSubclassRuntimeConfig === "function") {
  registerSubclassRuntimeConfig("Wizard_Abjurer", {
    spellcasting: {
      alwaysPreparedSpells: [
        { name: "Counterspell", minLevel: 10 },
        { name: "Dispel Magic", minLevel: 10 },
      ],
    },
  });
}

registerSubclassSheetEffects("Wizard_Abjurer", [

  { type: "ward", key: "arcane_ward", minLevel: 3, note: "Arcane Ward max HP = 2 × Wizard level + INT modifier." },
  { type: "reactionDefense", minLevel: 6, note: "Projected Ward." },
  { type: "spellSlotRefund", minLevel: 10, note: "Spell Breaker: Counterspell/Dispel Magic slot not expended if spell fails." },
  { type: "advantage", target: "save", source: "spells", minLevel: 14, note: "Spell Resistance." },
  { type: "passiveNote", minLevel: 14, note: "Spell Resistance: Resistance to damage of spells." },
]);
// [SheetRuntime] END

}

