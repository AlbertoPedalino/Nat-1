import { createAdapterBindings } from '../../adapterBindings.js';
import { addWizardSavantSpellChoices } from '../../classAdapterHelpers.js';

export default function install(registry, context = {}) {
  const {
    registerSubclassAdapter,
    registerSubclassSheetActions,
    registerSubclassSheetResources,
    registerSubclassSheetEffects,
    registerSubclassSheetSpellModifiers,
  } = createAdapterBindings(registry, context);
registerSubclassAdapter("Wizard_Evoker", function (cls, lv, specs) {
  addWizardSavantSpellChoices(specs, lv, { key: "evoker", label: "Evocation", school: "V" });
});

registerSubclassSheetActions("Wizard_Evoker", [
  { name: "Overchannel", cat: "action", resKey: "overchannel", minLevel: 14 },
]);
registerSubclassSheetResources("Wizard_Evoker", [
  { key: "overchannel", name: "Overchannel", recharge: "LR", max: () => 1 },
]);


registerSubclassSheetSpellModifiers("Wizard_Evoker", [
  {
    kind: "damage",
    school: "V",
    minLevel: 10,
    amount: "int",
    note: "Empowered Evocation",
  },
]);

}

