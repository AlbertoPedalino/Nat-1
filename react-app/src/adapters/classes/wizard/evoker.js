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
  { name: "Overchannel", icon: "", cat: "action", uses: "1st use free / LR", resKey: "overchannel", minLevel: 14 },
]);
registerSubclassSheetResources("Wizard_Evoker", [
  { key: "overchannel", name: "Overchannel", icon: "zap", recharge: "LR", max: () => 1 },
]);

registerSubclassSheetEffects("Wizard_Evoker", [
  { type: "cantripHalfDamage", minLevel: 3, note: "Potent Cantrip." },
  { type: "saveProtection", minLevel: 6, note: "Sculpt Spells." },
  { type: "passiveNote", minLevel: 10, note: "Empowered Evocation: add INT modifier to one damage roll of a Wizard Evocation spell." },
  { type: "maximizeSpellDamage", minLevel: 14, note: "Overchannel." },
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

