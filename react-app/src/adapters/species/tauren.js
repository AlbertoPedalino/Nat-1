import { createAdapterBindings } from '../adapterBindings.js';

// World of Warcraft. The lineage pick and Taunka's Cold Resistance come from
// the species data; the lineage's saving throw DC uses Strength, Constitution
// or Wisdom, chosen with the lineage.
const DC_ABILITY_KEY = 'species_lineage_ability';
const DC_ABILITIES = ['str', 'con', 'wis'];

export default function install(registry, context = {}) {
  const {
    registerSpeciesAdapter,
    registerSpeciesSheetActions,
    registerSpeciesSheetEffects,
    registerSpeciesSheetCommonChoiceMeta,
  } = createAdapterBindings(registry, context);

  registerSpeciesAdapter('Tauren_WoW', () => [
    { key: DC_ABILITY_KEY, label: 'Lineage Save DC Ability', type: 'ability_choice', from: DC_ABILITIES, count: 1, level: 1 },
  ]);
  registerSpeciesSheetCommonChoiceMeta('Tauren_WoW', {
    labels: { species_version: 'Tauren Lineage', [DC_ABILITY_KEY]: 'Lineage Save DC Ability' },
  });

  registerSpeciesSheetActions('Tauren_WoW', [
    {
      name: 'War Stomp',
      cat: 'special',
      minLevel: 1,
      requiredChoice: { key: 'species_version', value: 'Mulgore' },
    },
    {
      name: 'Highmountain Tauren',
      cat: 'action',
      minLevel: 1,
      requiredChoice: { key: 'species_version', value: 'Highmountain' },
    },
  ]);

  registerSpeciesSheetEffects('Tauren_WoW', [
    // Horns: an Unarmed Strike can deal 1d6 + Strength Piercing damage.
    { type: 'unarmedStrike', face: 6, minLevel: 1, note: 'Horns' },
    { type: 'acBonus', value: 1, minLevel: 1, requiredChoice: { key: 'species_version', value: 'Taunka' }, note: 'Taunka' },
  ]);
}
