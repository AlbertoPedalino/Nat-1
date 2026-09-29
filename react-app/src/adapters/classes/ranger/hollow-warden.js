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

  registerSubclassSheetEffects('Ranger_Hollow Warden', [
    {
      type: 'reminder',
      minLevel: 3,
      note: 'Hungering Might: +Wisdom modifier (minimum +1) to Constitution saving throws. Once per turn, when you hit while transformed and Bloodied, regain 1d10 + your Wisdom modifier Hit Points.',
    },
    {
      type: 'reminder',
      minLevel: 11,
      note: 'Rot and Violence (while transformed): a creature that fails its save vs Unnerving Aura also can\'t regain HP or take Reactions until the start of your next turn. Strangling Roots: on a weapon hit you can also activate the Sap or Slow mastery in addition to another mastery.',
    },
    {
      type: 'reminder',
      minLevel: 15,
      note: 'Ominous Strikes: when you hit a Frightened creature, the attack deals extra damage equal to your Wisdom modifier. Timeless: you have Immunity to the Exhaustion condition.',
    },
  ]);
}
