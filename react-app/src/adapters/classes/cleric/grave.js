import { createAdapterBindings } from '../../adapterBindings.js';

export default function install(registry, context = {}) {
  const {
    registerSubclassAdapter,
    registerSubclassSheetActions,
    registerSubclassSheetResources,
    registerSubclassSheetEffects,
  } = createAdapterBindings(registry, context);

  // Grave Domain Spells come from the subclass additionalSpells data. Path to the
  // Grave and Enhanced Necromancy spend Channel Divinity (a class resource).
  registerSubclassAdapter('Cleric_Grave', function () {});

  registerSubclassSheetActions('Cleric_Grave', [
    {
      name: 'Path to the Grave',
      
      cat: 'bonus',
      
      resKey: 'channel_div',
      minLevel: 3,
    },
    {
      name: "Sentinel at Death's Door",
      
      cat: 'reaction',
      
      resKey: 'grave_sentinel',
      minLevel: 6,
    },
    {
      name: 'Keeper of Souls',
      
      cat: 'special',
      
      resKey: 'grave_keeper',
      minLevel: 17,
    },
  ]);

  registerSubclassSheetResources('Cleric_Grave', [
    {
      key: 'grave_sentinel',
      name: "Sentinel at Death's Door",
      
      recharge: 'LR',
      minLevel: 6,
      max: 'abilityMod:wis', minMax: 1,
    },
    {
      key: 'grave_keeper',
      name: 'Keeper of Souls',
      
      recharge: 'SR+LR',
      minLevel: 17,
      max: 1,
    },
  ]);

}
