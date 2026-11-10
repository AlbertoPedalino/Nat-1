import { createAdapterBindings } from '../adapterBindings.js';

export default function install(registry, context = {}) {
  const {
    getGenericSpeciesChoiceSpecs,
    registerSpeciesAdapter,
    registerSpeciesSheetActions,
    registerSpeciesSheetResources,
    registerSpeciesSheetEffects,
  } = createAdapterBindings(registry, context);

  // Werewolf Instincts (skill choice from Perception/Stealth/Survival) is parsed
  // from the species JSON skillProficiencies; only Howl needs limited-use wiring.
  registerSpeciesAdapter('Lupin_RHW', function (s) {
    return getGenericSpeciesChoiceSpecs(s);
  });

  registerSpeciesSheetActions('Lupin_RHW', [
    {
      name: 'Howl',
      
      cat: 'bonus',
      
      resKey: 'lupin_howl',
      minLevel: 1,
    },
  ]);

  registerSpeciesSheetResources('Lupin_RHW', [
    {
      key: 'lupin_howl',
      name: 'Howl',
      
      recharge: 'LR',
      max: 'proficiencyBonus',
    },
  ]);

}
