import { createAdapterBindings } from '../adapterBindings.js';

export default function install(registry, context = {}) {
  const {
    registerSpeciesSheetCommonChoiceMeta,
    registerSpeciesSheetActions,
    registerSpeciesSheetResources,
  } = createAdapterBindings(registry, context);

  registerSpeciesSheetCommonChoiceMeta('Hexblood_RHW', {
    labels: {
      species_spell_ability: 'Spellcasting Ability (Hexblood)',
    },
  });

  registerSpeciesSheetActions('Hexblood_RHW', [
    {
      name: 'Eerie Token',
      cat: 'bonus',
      resKey: 'hexblood_token',
      minLevel: 1,
    },
  ]);

  registerSpeciesSheetResources('Hexblood_RHW', [
    {
      key: 'hexblood_token',
      name: 'Eerie Token',
      recharge: 'LR',
      max: 1,
    },
  ]);

  // Hex Magic: Disguise Self and Hex always prepared, each castable once per Long
  // Rest without a slot (or with slots you have). Ability comes from species_spell_ability.
}
