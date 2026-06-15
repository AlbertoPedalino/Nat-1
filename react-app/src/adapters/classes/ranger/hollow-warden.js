import { createAdapterBindings } from '../../adapterBindings.js';

export default function install(registry, context = {}) {
  const {
    registerSubclassAdapter,
    registerSubclassSheetActions,
    registerSubclassSheetResources,
    registerSubclassSheetEffects,
  } = createAdapterBindings(registry, context);

  // Hollow Warden Spells come from the subclass additionalSpells data. Wrath of the
  // Wild is fueled by Favored Enemy (a class resource).
  registerSubclassAdapter('Ranger_Hollow Warden', function () {});

  registerSubclassSheetActions('Ranger_Hollow Warden', [
    {
      name: 'Wrath of the Wild',
      icon: 'antler',
      cat: 'bonus',
      uses: 'Favored Enemy',
      minLevel: 3,
      desc: 'Bonus Action: expend a use of Favored Enemy to transform into a ghastly form for 1 minute (ends if Incapacitated, you die, or you end it). Ancient Armor: +1 AC (+2 at Ranger level 11). Prowling Retribution: when a creature within 5 ft damages you or an ally, you can make an Opportunity Attack against it. Unnerving Aura: on transforming and at the start of each of your turns, creatures of your choice in a 10-ft Emanation make a Wisdom save or are Frightened until the start of your next turn.',
    },
    {
      name: 'Fortifying Soul',
      icon: 'heart',
      cat: 'action',
      uses: '1 / LR',
      resKey: 'hollow_fortify',
      minLevel: 7,
      desc: 'Magic action: choose creatures you can see equal to your Wisdom modifier (minimum 1). Each regains {@dice 1d10} plus your Ranger level Hit Points and has Advantage on saves to avoid or end the Frightened condition for 1 hour. Once per Long Rest.',
    },
    {
      name: 'Persistent Wrath',
      icon: 'sparkles',
      cat: 'special',
      uses: '1 / LR',
      resKey: 'hollow_persist',
      minLevel: 15,
      desc: 'If you are reduced to 0 Hit Points but not killed outright while transformed using Wrath of the Wild, your Hit Points instead change to twice your Ranger level. Once per Long Rest, or expend a level 4+ spell slot (no action) to restore the use.',
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
