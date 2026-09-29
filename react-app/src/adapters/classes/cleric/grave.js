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
      icon: 'skull',
      cat: 'bonus',
      uses: '1 Channel',
      resKey: 'channel_div',
      minLevel: 3,
    },
    {
      name: "Sentinel at Death's Door",
      icon: 'shield',
      cat: 'reaction',
      uses: 'WIS mod / LR',
      resKey: 'grave_sentinel',
      minLevel: 6,
    },
    {
      name: 'Keeper of Souls',
      icon: 'heart',
      cat: 'special',
      uses: '1 / SR-LR',
      resKey: 'grave_keeper',
      minLevel: 17,
    },
  ]);

  registerSubclassSheetResources('Cleric_Grave', [
    {
      key: 'grave_sentinel',
      name: "Sentinel at Death's Door",
      icon: 'shield',
      recharge: 'LR',
      minLevel: 6,
      max: (lv, mods) => Math.max(1, mods?.wis ?? 1),
    },
    {
      key: 'grave_keeper',
      name: 'Keeper of Souls',
      icon: 'heart',
      recharge: 'SR+LR',
      minLevel: 17,
      max: 1,
    },
  ]);

  registerSubclassSheetEffects('Cleric_Grave', [
    {
      type: 'reminder',
      minLevel: 3,
      note: 'Pull of Death: once per turn, when you deal damage to a creature missing any Hit Points (by a spell or an attack roll), it takes an extra 1d4 Necrotic damage (1d6 at Cleric level 11).',
    },
  ]);
}
