import { createAdapterBindings } from '../../adapterBindings.js';
import { addWizardSavantSpellChoices } from '../../classAdapterHelpers.js';

export default function install(registry, context = {}) {
  const {
    registerSubclassAdapter,
    registerSubclassSheetActions,
    registerSubclassSheetResources,
    registerSubclassSheetEffects,
  } = createAdapterBindings(registry, context);
registerSubclassAdapter("Wizard_Diviner", function (cls, lv, specs) {
  addWizardSavantSpellChoices(specs, lv, { key: "diviner", label: "Divination", school: "D" });
});

// [SheetRuntime] START
registerSubclassSheetActions("Wizard_Diviner", [
  { name: "Portent", icon: "", cat: "action", uses: "2–3 / LR", resKey: "portent", minLevel: 3 },
  { name: "The Third Eye", icon: "", cat: "bonus", uses: "1 / SR+LR", resKey: "third_eye", minLevel: 10 },
]);
registerSubclassSheetResources("Wizard_Diviner", [
  { key: "portent",    name: "Portent",     icon: "eye",  recharge: "LR", max: (lv) => lv >= 14 ? 3 : 2 },
  { key: "third_eye",  name: "The Third Eye", icon: "eye", recharge: "SR", max: () => 1 },
]);

registerSubclassSheetEffects("Wizard_Diviner", [

  { type: "d20Replacement", key: "portent", minLevel: 3, note: "Portent." },
  { type: "spellSlotRecovery", minLevel: 6, note: "Expert Divination." },
  { type: "senseChoice", minLevel: 10, note: "The Third Eye: Darkvision 120 ft, read any language, or See Invisibility." },
]);
// [SheetRuntime] END

}

