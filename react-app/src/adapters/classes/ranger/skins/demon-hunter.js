import { createAdapterBindings } from '../../../adapterBindings.js';
import { finalAbilityModifier } from '../../../../shared/character/progression/abilityScores.js';
import { withModifier } from '../../../../shared/ui/numberFormat.js';

// Demon Hunter (World of Warcraft), a skin of the Ranger: the Ranger's entries
// come from its adapters, minus Feral Senses, which Improved Spectral Sight
// replaces. Its fixed subclass, also named Demon Hunter, picks one of the
// subclass's spell lists in the data (Devourer, Havoc, Vengeance), and spends
// soul fragments.
function soulFragments(level, mods) {
  const bonus = level >= 17 ? 2 : level >= 13 ? 1 : 0;
  return Math.max(1, Number(mods?.wis || 0)) + bonus;
}

export default function install(registry, context = {}) {
  const {
    registerClassSheetEffects,
    registerSubclassRuntimeConfig,
    registerSubclassSheetActions,
    registerSubclassSheetResources,
    registerSubclassSheetEffects,
  } = createAdapterBindings(registry, context);

  registerClassSheetEffects('Demon Hunter', [
    { type: 'sense', senseType: 'truesight', value: 30, minLevel: 18, note: 'Improved Spectral Sight' },
  ]);

  registerSubclassRuntimeConfig('Demon Hunter_Demon Hunter', { spellListChoice: { label: 'Demon Hunter Spells' } });
  registerSubclassSheetActions('Demon Hunter_Demon Hunter', [
    {
      name: 'Soul Cleave',
      cat: 'attack',
      resKey: 'soul_fragments',
      minLevel: 3,
      rollers: [
        {
          kind: 'damage',
          formula: ({ character, ownerLevel }) => withModifier(Number(ownerLevel) >= 15 ? '2d12' : '1d12', finalAbilityModifier(character, 'wis')),
          label: ({ formula }) => `${formula} psychic`,
        },
      ],
    },
    { name: 'Double Jump', cat: 'special', resKey: 'soul_fragments', minLevel: 3 },
    { name: 'Disrupt', cat: 'reaction', resKey: 'soul_fragments', minLevel: 11 },
    { name: 'Warglaive Mastery', cat: 'bonus', resKey: 'soul_fragments', minLevel: 11 },
  ]);
  registerSubclassSheetResources('Demon Hunter_Demon Hunter', [
    { key: 'soul_fragments', name: 'Soul Fragments', recharge: 'LR', max: soulFragments, minLevel: 3 },
  ]);
  registerSubclassSheetEffects('Demon Hunter_Demon Hunter', [
    { type: 'sense', senseType: 'blindsight', value: 10, minLevel: 3, note: 'Spectral Sight' },
  ]);
}
