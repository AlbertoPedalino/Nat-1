import { createAdapterBindings } from '../../adapterBindings.js';
import { finalAbilityModifier } from '../../../shared/character/progression/abilityScores.js';
import { withModifier } from '../../../shared/ui/numberFormat.js';
import { spellcastingNumbers } from '../../../shared/character/spells/spellcastingNumbers.js';

// Discipline Domain (World of Warcraft). Its always-prepared spells come from
// the subclass data.
export default function install(registry, context = {}) {
  const { registerSubclassSheetActions } = createAdapterBindings(registry, context);

  registerSubclassSheetActions('Cleric_Discipline', [
    {
      name: 'Holy Bolt',
      cat: 'bonus',
      resKey: 'channel_div',
      minLevel: 3,
      attackBonus: ({ character }) => spellcastingNumbers(character, 'wis').attack,
      rollers: [
        { kind: 'damage', formula: ({ character }) => withModifier('2d10', finalAbilityModifier(character, 'wis')), label: ({ formula }) => `${formula} radiant` },
        { kind: 'heal', formula: ({ character }) => withModifier('1d10', finalAbilityModifier(character, 'wis')) },
      ],
    },
    {
      name: 'Luminous Barrier',
      cat: 'bonus',
      resKey: 'channel_div',
      minLevel: 6,
      inlinePills: ({ character, ownerLevel }) => [
        { label: 'Temp HP', value: Number(ownerLevel || 0) + finalAbilityModifier(character, 'wis') },
      ],
    },
  ]);
}
