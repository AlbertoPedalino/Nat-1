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
      max: (lv, mods) => Math.max(1, mods?.cha ?? 1),
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
    {
      type: 'reminder',
      minLevel: 6,
      note: 'Grave Touched: your Necrotic damage ignores Resistance to Necrotic, and once per turn you can change a damage spell\'s damage type to Necrotic. Dreaded Necrosis: while in Form of Dread, once per turn add one extra damage die to Necrotic damage you deal on a hit. Undead Endurance: no Exhaustion from dehydration/malnutrition/suffocation; no need to sleep, and magic can\'t put you to sleep.',
    },
    { type: 'resistance', damageTypes: ['Necrotic'], minLevel: 10, note: 'Necrotic Resilience (Immunity while in Form of Dread).' },
    {
      type: 'reminder',
      minLevel: 14,
      note: 'Superior Dread (while in Form of Dread): Resistance to Bludgeoning, Piercing, and Slashing damage; a Fly Speed equal to your Speed with hover and incorporeal movement; and you cast Conjuration/Necromancy Warlock spells without V/S/M components (except costly or consumed materials).',
    },
  ]);
}
