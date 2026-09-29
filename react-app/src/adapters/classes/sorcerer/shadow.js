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
    },
    {
      name: 'Beasts of Ill Omen',
      icon: 'paw',
      cat: 'bonus',
      uses: '3 Sorcery Points',
      resKey: 'sorc_pts',
      minLevel: 6,
    },
    {
      name: 'Shadow Walk',
      icon: 'moon',
      cat: 'bonus',
      uses: 'At will',
      minLevel: 14,
    },
    {
      name: 'Umbral Form',
      icon: 'ghost',
      cat: 'special',
      uses: '1 / LR',
      resKey: 'shadow_umbral',
      minLevel: 18,
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
