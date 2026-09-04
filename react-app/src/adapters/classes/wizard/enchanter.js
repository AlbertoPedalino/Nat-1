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
    { name: 'Hypnotic Presence', icon: 'eye', cat: 'bonus', uses: 'INT mod / LR', resKey: 'enchanter_presence', minLevel: 3, desc: 'A creature within 10 feet that can see or hear you makes a Wisdom save or is Charmed, Incapacitated, and has Speed 0 for up to 1 minute, subject to the feature ending conditions.' },
    { name: 'Split Enchantment', icon: 'split', cat: 'special', uses: 'INT mod / LR', resKey: 'enchanter_split', minLevel: 6, desc: 'When a slotted Enchantment can gain an extra target by upcasting, increase its effective spell level by 1.' },
    { name: 'Instinctive Charm', icon: 'shield', cat: 'reaction', uses: '1 / LR', resKey: 'enchanter_charm', minLevel: 10, desc: 'When a visible creature within 30 feet hits you, force a Wisdom save. On failure the attack misses and can be redirected. Restore the use on a Long Rest or by casting a slotted Enchantment.' },
    { name: 'Alter Memories', icon: 'brain', cat: 'action', uses: 'While target is Charmed', minLevel: 14, desc: 'A target Charmed by your slotted Enchantment can remain unaware of the influence; once before the spell ends, a Magic action can force an Intelligence save to remove recent memories.' },
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
