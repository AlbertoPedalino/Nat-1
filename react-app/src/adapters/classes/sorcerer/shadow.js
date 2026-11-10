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
      
      cat: 'special',
      
      resKey: 'shadow_strength',
      minLevel: 3,
    },
    {
      name: 'Beasts of Ill Omen',
      
      cat: 'bonus',
      
      resKey: 'sorc_pts',
      minLevel: 6,
    },
    {
      name: 'Shadow Walk',
      
      cat: 'bonus',
      
      minLevel: 14,
    },
    {
      name: 'Umbral Form',
      
      cat: 'special',
      
      resKey: 'shadow_umbral',
      minLevel: 18,
    },
  ]);

  registerSubclassSheetResources('Sorcerer_Shadow', [
    {
      key: 'shadow_strength',
      name: 'Strength of the Grave',
      
      recharge: 'LR',
      minLevel: 3,
      max: 1,
    },
    {
      key: 'shadow_umbral',
      name: 'Umbral Form',
      
      recharge: 'LR',
      minLevel: 18,
      max: 1,
    },
  ]);

  registerSubclassSheetEffects('Sorcerer_Shadow', [
    { type: 'sense', senseType: 'darkvision', value: 120, minLevel: 3, note: 'Eyes of the Dark.' },
    { type: 'sense', senseType: 'blindsight', value: 10, minLevel: 3, note: 'Eyes of the Dark.' },
  ]);
}
