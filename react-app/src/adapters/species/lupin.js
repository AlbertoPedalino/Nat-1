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
      icon: 'wolf',
      cat: 'bonus',
      uses: 'PB / LR',
      resKey: 'lupin_howl',
      minLevel: 1,
    },
  ]);

  registerSpeciesSheetResources('Lupin_RHW', [
    {
      key: 'lupin_howl',
      name: 'Howl',
      icon: 'wolf',
      recharge: 'LR',
      max: 'proficiencyBonus',
    },
  ]);

  registerSpeciesSheetEffects('Lupin_RHW', [
    {
      type: 'reminder',
      minLevel: 1,
      note: 'Feral Pounce: your Unarmed Strikes deal Slashing damage. When you hit with an Unarmed Strike as part of the Attack action on your turn, you can use both the Damage and Shove options (once per turn).',
    },
  ]);
}
