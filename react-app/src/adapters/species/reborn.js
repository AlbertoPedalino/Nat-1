import { createAdapterBindings } from '../adapterBindings.js';

export default function install(registry, context = {}) {
  const {
    getGenericSpeciesChoiceSpecs,
    registerSpeciesAdapter,
    registerSpeciesSheetActions,
    registerSpeciesSheetResources,
    registerSpeciesSheetEffects,
  } = createAdapterBindings(registry, context);

  // Knowledge from a Past Life (skill choice) and Strange Endurance (resistance
  // choice from Cold/Necrotic/Poison) are parsed from the species JSON; only the
  // limited-use d6 reroll aid needs wiring.
  registerSpeciesAdapter('Reborn_RHW', function (s) {
    return getGenericSpeciesChoiceSpecs(s);
  });

  registerSpeciesSheetActions('Reborn_RHW', [
    {
      name: 'Knowledge from a Past Life',
      
      cat: 'special',
      
      resKey: 'reborn_knowledge',
      minLevel: 1,
    },
  ]);

  registerSpeciesSheetResources('Reborn_RHW', [
    {
      key: 'reborn_knowledge',
      name: 'Knowledge from a Past Life',
      
      recharge: 'LR',
      max: 'proficiencyBonus',
    },
  ]);

}
