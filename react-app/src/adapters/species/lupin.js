import { createAdapterBindings } from '../adapterBindings.js';
import { saveDcPills } from '../../shared/character/progression/featureSaveDc.js';

export default function install(registry, context = {}) {
  const {
    registerSpeciesAdapter,
    registerSpeciesSheetActions,
    registerSpeciesSheetResources,
    registerSpeciesSheetEffects,
  } = createAdapterBindings(registry, context);

  // Werewolf Instincts (skill choice from Perception/Stealth/Survival) is parsed
  // from the species JSON skillProficiencies; only Howl needs limited-use wiring.

  registerSpeciesSheetActions('Lupin_RHW', [
    {
      name: 'Howl',
      cat: 'bonus',
      resKey: 'lupin_howl',
      minLevel: 1,
      inlinePills: saveDcPills('con'),
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
