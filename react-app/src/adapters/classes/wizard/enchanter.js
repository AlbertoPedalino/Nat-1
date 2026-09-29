import { createAdapterBindings } from '../../adapterBindings.js';
import { addWizardSavantSpellChoices } from './wizardSavant.js';

export default function install(registry, context = {}) {
  const {
    registerSubclassAdapter,
    registerSubclassSheetActions,
    registerSubclassSheetResources,
    registerSubclassSheetEffects,
  } = createAdapterBindings(registry, context);

  registerSubclassAdapter('Wizard_Enchanter', function (cls, level, specs) {
    addWizardSavantSpellChoices(specs, level, {
      key: 'enchanter', label: 'Enchantment', school: 'E',
    });
    if (level >= 3) {
      specs.push({
        key: 'subclass_enchanter_conversationalist',
        label: 'Enchanting Conversationalist - Skill',
        type: 'skill_choice',
        from: ['Deception', 'Intimidation', 'Persuasion'],
        count: 1,
        level: 3,
      });
    }
  });

  registerSubclassSheetActions('Wizard_Enchanter', [
    { name: 'Hypnotic Presence', icon: 'eye', cat: 'bonus', uses: 'INT mod / LR', resKey: 'enchanter_presence', minLevel: 3 },
    { name: 'Split Enchantment', icon: 'split', cat: 'special', uses: 'INT mod / LR', resKey: 'enchanter_split', minLevel: 6 },
    { name: 'Instinctive Charm', icon: 'shield', cat: 'reaction', uses: '1 / LR', resKey: 'enchanter_charm', minLevel: 10 },
    { name: 'Alter Memories', icon: 'brain', cat: 'action', uses: 'While target is Charmed', minLevel: 14 },
  ]);
  registerSubclassSheetResources('Wizard_Enchanter', [
    { key: 'enchanter_presence', name: 'Hypnotic Presence', icon: 'eye', recharge: 'LR', minLevel: 3, max: (level, { int } = {}) => Math.max(1, int ?? 0) },
    { key: 'enchanter_split', name: 'Split Enchantment', icon: 'split', recharge: 'LR', minLevel: 6, max: (level, { int } = {}) => Math.max(1, int ?? 0) },
    { key: 'enchanter_charm', name: 'Instinctive Charm', icon: 'shield', recharge: 'LR', minLevel: 10, max: 1 },
  ]);
  registerSubclassSheetEffects('Wizard_Enchanter', [
    { type: 'reminder', minLevel: 3, note: 'Enchanting Conversationalist: add INT modifier (minimum +1) to checks with the selected social skill.' },
  ]);
}
