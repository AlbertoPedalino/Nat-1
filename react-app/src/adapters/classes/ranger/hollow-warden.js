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
      icon: 'antler',
      cat: 'bonus',
      uses: 'Favored Enemy',
      minLevel: 3,
    },
    {
      name: 'Fortifying Soul',
      icon: 'heart',
      cat: 'action',
      uses: '1 / LR',
      resKey: 'hollow_fortify',
      minLevel: 7,
    },
    {
      name: 'Persistent Wrath',
      icon: 'sparkles',
      cat: 'special',
      uses: '1 / LR',
      resKey: 'hollow_persist',
      minLevel: 15,
    },
  ]);

  registerSubclassSheetResources('Ranger_Hollow Warden', [
    {
      key: 'hollow_fortify',
      name: 'Fortifying Soul',
      icon: 'heart',
      recharge: 'LR',
      minLevel: 7,
      max: 1,
    },
    {
      key: 'hollow_persist',
      name: 'Persistent Wrath',
      icon: 'sparkles',
      recharge: 'LR',
      minLevel: 15,
      max: 1,
    },
  ]);

}
