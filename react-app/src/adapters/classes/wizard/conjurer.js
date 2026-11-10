import { createAdapterBindings } from '../../adapterBindings.js';
import { addWizardSavantSpellChoices } from '../../classAdapterHelpers.js';

export default function install(registry, context = {}) {
  const {
    registerSubclassAdapter,
    registerSubclassSheetActions,
    registerSubclassSheetResources,
    registerSubclassSheetEffects,
  } = createAdapterBindings(registry, context);

  registerSubclassAdapter('Wizard_Conjurer', function (cls, level, specs) {
    addWizardSavantSpellChoices(specs, level, {
      key: 'conjurer', label: 'Conjuration', school: 'C',
    });
  });

  registerSubclassSheetActions('Wizard_Conjurer', [
    { name: 'Benign Transposition', cat: 'bonus', resKey: 'conjurer_transposition', minLevel: 3 },
    { name: 'Splintered Summons', cat: 'special', resKey: 'conjurer_splintered', minLevel: 14 },
  ]);
  registerSubclassSheetResources('Wizard_Conjurer', [
    { key: 'conjurer_transposition', name: 'Benign Transposition', recharge: 'LR', minLevel: 3, max: 'abilityMod:int', minMax: 1 },
    { key: 'conjurer_splintered', name: 'Splintered Summons', recharge: 'LR', minLevel: 14, max: 1 },
  ]);
}
