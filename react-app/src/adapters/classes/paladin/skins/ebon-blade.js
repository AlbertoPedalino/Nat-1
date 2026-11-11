import { createAdapterBindings } from '../../../adapterBindings.js';
import { SUBCLASS_SPELL_LIST_KEY } from '../../../../shared/character/progression/choiceUtils.js';
import { classEntities } from '../../../../shared/character/progression/classLevel.js';
import { subclassSpellListNames } from '../../../../shared/character/spells/autoGrantedSpells.js';

// Oath of the Ebon Blade (World of Warcraft), the Death Knight's fixed
// subclass. The rune of Runeforging is the pick among the subclass's spell
// lists in the data (Blood, Frost, Unholy), which then brings its spells.
const rune = (value) => ({ key: SUBCLASS_SPELL_LIST_KEY, value });

// The runes are the subclass's spell lists in the data, as in the builder.
function runeOptions({ character, action }) {
  const entity = classEntities(character).find((candidate) => candidate.choicePrefix === (action.choicePrefix || ''));
  return subclassSpellListNames(entity).map((name) => ({ value: name, label: name }));
}

export default function install(registry, context = {}) {
  const {
    registerSubclassRuntimeConfig,
    registerSubclassSheetActions,
    registerSubclassSheetResources,
    registerSubclassSheetEffects,
  } = createAdapterBindings(registry, context);

  registerSubclassRuntimeConfig('Death Knight_Ebon Blade', { spellListChoice: { label: 'Runeforging Rune' } });

  registerSubclassSheetActions('Death Knight_Ebon Blade', [
    {
      name: 'Runeforging',
      cat: 'special',
      minLevel: 3,
      choiceKey: SUBCLASS_SPELL_LIST_KEY,
      choiceLabel: 'Rune',
      choiceOptions: runeOptions,
      choiceAllowClear: true,
      choiceRestNote: 'Whenever you gain a level, you can replace the rune with a different one.',
    },
    { name: 'Runic Power: Blood', cat: 'special', resKey: 'paladin_channel_div', minLevel: 3, requiredChoice: rune('Blood') },
    {
      name: 'Runic Power: Frost',
      cat: 'special',
      resKey: 'paladin_channel_div',
      minLevel: 3,
      requiredChoice: rune('Frost'),
      rollers: [{ kind: 'damage', formula: '2d6', label: ({ formula }) => `${formula} cold` }],
    },
    {
      name: 'Runic Power: Unholy',
      cat: 'special',
      resKey: 'paladin_channel_div',
      minLevel: 3,
      requiredChoice: rune('Unholy'),
      rollers: [{ kind: 'utility', formula: '1d6', label: 'Save penalty' }],
    },
    { name: 'Runic Mastery: Blood', cat: 'reaction', resKey: 'ebon_blade_runic_mastery', minLevel: 15, requiredChoice: rune('Blood') },
    {
      name: 'Runic Mastery: Frost',
      cat: 'special',
      resKey: 'ebon_blade_runic_mastery',
      minLevel: 15,
      requiredChoice: rune('Frost'),
      rollers: [{ kind: 'damage', formula: '8d6', label: ({ formula }) => `${formula} cold` }],
    },
    { name: 'Runic Mastery: Unholy', cat: 'special', resKey: 'ebon_blade_runic_mastery', minLevel: 15, requiredChoice: rune('Unholy') },
    { name: 'Aspect of the Horsemen', cat: 'bonus', resKey: 'ebon_blade_horsemen', minLevel: 20 },
  ]);
  registerSubclassSheetResources('Death Knight_Ebon Blade', [
    { key: 'ebon_blade_runic_mastery', name: 'Runic Mastery', recharge: 'LR', max: 1, minLevel: 15 },
    { key: 'ebon_blade_horsemen', name: 'Aspect of the Horsemen', recharge: 'LR', max: 1, minLevel: 20 },
  ]);
  registerSubclassSheetEffects('Death Knight_Ebon Blade', [
    { type: 'resistance', damageTypes: ['Cold', 'Necrotic', 'Psychic'], minLevel: 7, note: 'Aura of Deathly Endurance' },
  ]);
}
