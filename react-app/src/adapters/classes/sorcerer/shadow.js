import { createAdapterBindings } from '../../adapterBindings.js';

export default function install(registry, context = {}) {
  const {
    registerSubclassAdapter,
    registerSubclassSheetActions,
    registerSubclassSheetResources,
    registerSubclassSheetEffects,
  } = createAdapterBindings(registry, context);

  // Shadow Spells come from the subclass additionalSpells data. Beasts of Ill Omen
  // and Umbral Form spend Sorcery Points (the class resource, key sorc_pts).
  registerSubclassAdapter('Sorcerer_Shadow', function () {});

  registerSubclassSheetActions('Sorcerer_Shadow', [
    {
      name: 'Strength of the Grave',
      icon: 'skull',
      cat: 'special',
      uses: '1 / LR',
      resKey: 'shadow_strength',
      minLevel: 3,
      desc: 'If you would drop to 0 Hit Points and not die outright, make a Charisma saving throw (DC 5 plus the damage taken). On a success, your Hit Points instead change to your Charisma modifier plus your Sorcerer level. Once per Long Rest.',
    },
    {
      name: 'Beasts of Ill Omen',
      icon: 'paw',
      cat: 'bonus',
      uses: '3 Sorcery Points',
      resKey: 'sorc_pts',
      minLevel: 6,
      desc: 'Spend 3 Sorcery Points to cast Summon Beast as a Bonus Action without a spell slot, without preparing it, and without Material components. The shadow beast gives enemies within 5 ft of it Disadvantage on saves against your spells. You can cast it without Concentration (duration becomes 1 minute; ends early if you cast it again).',
    },
    {
      name: 'Shadow Walk',
      icon: 'moon',
      cat: 'bonus',
      uses: 'At will',
      minLevel: 14,
      desc: 'While in Dim Light or Darkness, take a Bonus Action to teleport up to 120 ft to an unoccupied space you can see that is also in Dim Light or Darkness.',
    },
    {
      name: 'Umbral Form',
      icon: 'ghost',
      cat: 'special',
      uses: '1 / LR',
      resKey: 'shadow_umbral',
      minLevel: 18,
      desc: 'When you use Innate Sorcery, you can adopt a shadowy form for its duration (or until you end it). You can move through creatures and objects as Difficult Terrain (1d10 Force damage if you end your turn inside one) and have Resistance to all damage except Force and Radiant. Once per Long Rest, or spend 6 Sorcery Points (no action) to restore the use.',
    },
  ]);

  registerSubclassSheetResources('Sorcerer_Shadow', [
    {
      key: 'shadow_strength',
      name: 'Strength of the Grave',
      icon: 'skull',
      recharge: 'LR',
      minLevel: 3,
      max: 1,
    },
    {
      key: 'shadow_umbral',
      name: 'Umbral Form',
      icon: 'ghost',
      recharge: 'LR',
      minLevel: 18,
      max: 1,
    },
  ]);

  registerSubclassSheetEffects('Sorcerer_Shadow', [
    { type: 'sense', senseType: 'darkvision', value: 120, minLevel: 3, note: 'Eyes of the Dark.' },
    { type: 'sense', senseType: 'blindsight', value: 10, minLevel: 3, note: 'Eyes of the Dark.' },
    {
      type: 'reminder',
      minLevel: 3,
      note: 'Eyes of the Dark: if a spell you cast creates an area of Darkness, you can see normally through that Darkness.',
    },
  ]);
}
