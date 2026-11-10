import { createAdapterBindings } from '../../adapterBindings.js';
import { addWizardSavantSpellChoices } from '../../classAdapterHelpers.js';

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
    { name: 'Hypnotic Presence', cat: 'action', resKey: 'enchanter_presence', minLevel: 3 },
    { name: 'Split Enchantment', cat: 'special', resKey: 'enchanter_split', minLevel: 6 },
    { name: 'Instinctive Charm', cat: 'reaction', resKey: 'enchanter_charm', minLevel: 10 },
    { name: 'Alter Memories', cat: 'action', minLevel: 14 },
  ]);
  registerSubclassSheetResources('Wizard_Enchanter', [
    { key: 'enchanter_presence', name: 'Hypnotic Presence', recharge: 'LR', minLevel: 3, max: 'abilityMod:int', minMax: 1 },
    { key: 'enchanter_split', name: 'Split Enchantment', recharge: 'LR', minLevel: 6, max: 'abilityMod:int', minMax: 1 },
    { key: 'enchanter_charm', name: 'Instinctive Charm', recharge: 'LR', minLevel: 10, max: 1 },
  ]);
}
