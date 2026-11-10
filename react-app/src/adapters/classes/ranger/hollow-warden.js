import { createAdapterBindings } from '../../adapterBindings.js';

export default function install(registry, context = {}) {
  const {
    registerSubclassAdapter,
    registerSubclassSheetActions,
    registerSubclassSheetResources,
    registerSubclassSheetEffects,
  } = createAdapterBindings(registry, context);

  // Hollow Warden Spells come from the subclass additionalSpells data. Wrath of the
  // Wild shares the Favored Enemy uses tracked on the Hunter's Mark spell.
  registerSubclassAdapter('Ranger_Hollow Warden', function () {});

  registerSubclassSheetActions('Ranger_Hollow Warden', [
    {
      name: 'Wrath of the Wild',
      
      cat: 'bonus',
      
      minLevel: 3,
    },
    {
      name: 'Fortifying Soul',
      
      cat: 'action',
      
      resKey: 'hollow_fortify',
      minLevel: 7,
    },
    {
      name: 'Persistent Wrath',
      
      cat: 'special',
      
      resKey: 'hollow_persist',
      minLevel: 15,
    },
  ]);

  registerSubclassSheetResources('Ranger_Hollow Warden', [
    {
      key: 'hollow_fortify',
      name: 'Fortifying Soul',
      
      recharge: 'LR',
      minLevel: 7,
      max: 1,
    },
    {
      key: 'hollow_persist',
      name: 'Persistent Wrath',
      
      recharge: 'LR',
      minLevel: 15,
      max: 1,
    },
  ]);

}
