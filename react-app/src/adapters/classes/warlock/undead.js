import { createAdapterBindings } from '../../adapterBindings.js';

export default function install(registry, context = {}) {
  const {
    registerSubclassAdapter,
    registerSubclassSheetActions,
    registerSubclassSheetResources,
    registerSubclassSheetEffects,
  } = createAdapterBindings(registry, context);

  // Undead Spells come from the subclass additionalSpells data.
  registerSubclassAdapter('Warlock_Undead', function () {});

  registerSubclassSheetActions('Warlock_Undead', [
    {
      name: 'Form of Dread',
      icon: 'skull',
      cat: 'bonus',
      uses: 'CHA mod / LR',
      resKey: 'undead_form_of_dread',
      minLevel: 3,
      // Facsimile of Life: 1d10 + Warlock level Temp HP, as a clickable roller.
      rollers: [{ kind: 'tempHp', formula: ({ ownerLevel }) => `1d10+${ownerLevel}` }],
    },
    {
      name: 'Unholy Resuscitation',
      icon: 'skull',
      cat: 'special',
      uses: '1 / SR-LR',
      resKey: 'undead_resuscitation',
      minLevel: 10,
      rollers: [{ kind: 'damage', formula: '2d10', label: ({ formula }) => `${formula} + CHA necrotic` }],
    },
  ]);

  registerSubclassSheetResources('Warlock_Undead', [
    {
      key: 'undead_form_of_dread',
      name: 'Form of Dread',
      icon: 'skull',
      recharge: 'LR',
      minLevel: 3,
      max: 'abilityMod:cha', minMax: 1,
    },
    {
      key: 'undead_resuscitation',
      name: 'Unholy Resuscitation',
      icon: 'skull',
      recharge: 'SR+LR',
      minLevel: 10,
      max: 1,
    },
  ]);

  registerSubclassSheetEffects('Warlock_Undead', [
    { type: 'resistance', damageTypes: ['Necrotic'], minLevel: 10, note: 'Necrotic Resilience (Immunity while in Form of Dread).' },
  ]);
}
