import { createAdapterBindings } from '../adapterBindings.js';
import { finalAbilityModifier } from '../../shared/character/progression/abilityScores.js';
import { getProficiencyBonus } from '../../shared/character/progression/proficiency.js';

// World of Warcraft. Darkvision 120 ft and Poison Resistance come from the
// species data.
export default function install(registry, context = {}) {
  const { registerSpeciesSheetActions, registerSpeciesSheetEffects } = createAdapterBindings(registry, context);

  registerSpeciesSheetActions('Earthen_WoW', [
    {
      name: 'Azerite Surge',
      cat: 'special',
      minLevel: 1,
      rollers: [
        { kind: 'heal', formula: '1d10' },
        { kind: 'damage', formula: '1d10', label: ({ formula }) => `${formula} radiant` },
      ],
      inlinePills: ({ character }) => [
        { label: 'Save DC', value: 8 + finalAbilityModifier(character, 'con') + getProficiencyBonus(character) },
        { label: 'Area', value: '15-ft Cone' },
      ],
    },
  ]);
  registerSpeciesSheetEffects('Earthen_WoW', [
    { type: 'advantage', target: 'save', conditions: ['Poisoned'], minLevel: 1, note: 'Earthen Resilience' },
  ]);
}
