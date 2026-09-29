import { createAdapterBindings } from '../../adapterBindings.js';
import { addWizardSavantSpellChoices } from './wizardSavant.js';

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
    { name: 'Benign Transposition', icon: 'move', cat: 'bonus', uses: 'INT mod / LR', resKey: 'conjurer_transposition', minLevel: 3 },
    { name: 'Splintered Summons', icon: 'copy-plus', cat: 'special', uses: '1 / LR', resKey: 'conjurer_splintered', minLevel: 14 },
  ]);
  registerSubclassSheetResources('Wizard_Conjurer', [
    { key: 'conjurer_transposition', name: 'Benign Transposition', icon: 'move', recharge: 'LR', minLevel: 3, max: (level, { int } = {}) => Math.max(1, int ?? 0) },
    { key: 'conjurer_splintered', name: 'Splintered Summons', icon: 'copy-plus', recharge: 'LR', minLevel: 14, max: 1 },
  ]);
  registerSubclassSheetEffects('Wizard_Conjurer', [
    { type: 'reminder', minLevel: 6, note: 'Durable Summons: summoned creature THP = 2 x Wizard level.' },
    { type: 'reminder', minLevel: 10, note: 'Focused Conjuration: damage cannot break Concentration on Conjuration spells.' },
  ]);
}
