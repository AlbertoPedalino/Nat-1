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
registerSubclassAdapter("Wizard_Illusionist", function (cls, lv, specs) {
  addWizardSavantSpellChoices(specs, lv, { key: "illusionist", label: "Illusion", school: "I" });
});

registerSubclassSheetActions("Wizard_Illusionist", [
  { name: "Phantasmal Creatures", cat: "action", resKey: "phantasmal_creatures", minLevel: 6 },
  { name: "Illusory Self", cat: "reaction", resKey: "illusory_self", minLevel: 10 },
  { name: "Illusory Reality", cat: "bonus", minLevel: 14 },
]);
registerSubclassSheetResources("Wizard_Illusionist", [
  { key: "phantasmal_creatures", name: "Phantasmal Creatures", recharge: "LR", max: () => 2 },
  { key: "illusory_self",        name: "Illusory Self",         recharge: "SR", max: () => 1 },
]);
registerSubclassSheetEffects("Wizard_Illusionist", [
  { type: "alwaysKnownSpell", spells: ["Minor Illusion"], minLevel: 3, note: "Improved Illusions." },
]);

}

