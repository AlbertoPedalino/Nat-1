import { createAdapterBindings } from '../adapterBindings.js';
import { getProficiencyBonus } from '../../shared/character/progression/proficiency.js';

// World of Warcraft.
export default function install(registry, context = {}) {
  const { registerSpeciesSheetActions, registerSpeciesSheetResources } = createAdapterBindings(registry, context);

  registerSpeciesSheetActions('Worgen_WoW', [
    {
      name: 'Darkflight',
      cat: 'bonus',
      resKey: 'worgen_darkflight',
      minLevel: 1,
      inlinePills: ({ character }) => [
        { label: 'Temp HP', value: 2 * getProficiencyBonus(character) },
      ],
    },
  ]);
  registerSpeciesSheetResources('Worgen_WoW', [
    { key: 'worgen_darkflight', name: 'Darkflight', recharge: 'LR', max: 'proficiencyBonus' },
  ]);
}
