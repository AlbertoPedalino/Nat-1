import { createAdapterBindings } from '../../adapterBindings.js';

export default function install(registry, context = {}) {
  const {
    registerSubclassAdapter,
    registerSubclassSheetActions,
    registerSubclassSheetResources,
    registerSubclassSheetEffects,
    registerSubclassRuntimeConfig,
  } = createAdapterBindings(registry, context);
registerSubclassAdapter("Wizard_Illusionist", function (cls, lv, specs) {
  if (typeof addWizardSavantSpellChoices === "function") {
    addWizardSavantSpellChoices(specs, lv, { key: "illusionist", label: "Illusion", school: "I" });
  }
});

// [SheetRuntime] START
registerSubclassSheetActions("Wizard_Illusionist", [
  { name: "Phantasmal Creatures", icon: "", cat: "action", uses: "2 / LR", resKey: "phantasmal_creatures", minLevel: 6 },
  { name: "Illusory Self", icon: "", cat: "reaction", uses: "1 / SR+LR or lv2+ slot", resKey: "illusory_self", minLevel: 10 },
  { name: "Illusory Reality", icon: "", cat: "bonus", uses: "With Illusion slot", minLevel: 14 },
]);
registerSubclassSheetResources("Wizard_Illusionist", [
  { key: "phantasmal_creatures", name: "Phantasmal Creatures", icon: "ghost", recharge: "LR", max: () => 2 },
  { key: "illusory_self",        name: "Illusory Self",         icon: "user",  recharge: "SR", max: () => 1 },
]);
if (typeof registerSubclassRuntimeConfig === "function") {
  registerSubclassRuntimeConfig("Wizard_Illusionist", {
    spellcasting: {
      alwaysKnownSpells: [
        { name: "Minor Illusion", minLevel: 3 },
      ],
      alwaysPreparedSpells: [
        { name: "Summon Beast", minLevel: 6 },
        { name: "Summon Fey", minLevel: 6 },
      ],
    },
  });
}

registerSubclassSheetEffects("Wizard_Illusionist", [
  { type: "passiveNote", minLevel: 3, note: "Improved Illusions: no Verbal component; +60 ft range when range is 10+ ft." },
  { type: "alwaysKnownSpell", spells: ["Minor Illusion"], minLevel: 3, note: "Improved Illusions." },
  { type: "summonModifier", minLevel: 6, note: "Phantasmal Creatures." },
  { type: "reactionDefense", minLevel: 10, note: "Illusory Self." },
  { type: "illusionObjectReality", minLevel: 14, note: "Illusory Reality." },
]);
// [SheetRuntime] END

}

