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
    { name: 'Benign Transposition', icon: 'move', cat: 'bonus', uses: 'INT mod / LR', resKey: 'conjurer_transposition', minLevel: 3, desc: 'Teleport to a visible unoccupied space, or swap with a willing Medium or smaller creature: 30 feet, increasing to 60 feet at level 6. At level 6, expend a level 3+ slot to restore one use.' },
    { name: 'Splintered Summons', icon: 'copy-plus', cat: 'special', uses: '1 / LR', resKey: 'conjurer_splintered', minLevel: 14, desc: 'A slotted Conjuration spell with an included spirit stat block can summon two identical creatures, each with half maximum/current HP. Restore the use with a Long Rest or a level 5+ spell slot.' },
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
