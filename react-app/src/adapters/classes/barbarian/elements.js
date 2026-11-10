import { createAdapterBindings } from '../../adapterBindings.js';
import { featureSaveDc } from '../../../shared/character/progression/featureSaveDc.js';
import { rageDamageBonus } from './rageDamage.js';

// Path of the Elements (World of Warcraft). Echo of the Elements' spells come
// from the subclass data.
function elementsSaveDc({ character }) {
  return [{ label: 'Save DC', value: featureSaveDc(character, 'con') }];
}

function rageDice(face) {
  return ({ ownerLevel }) => `${rageDamageBonus(ownerLevel)}d${face}`;
}

function raging(C) { return !!C && C.rageActive === true; }

export default function install(registry, context = {}) {
  const { registerSubclassSheetActions, registerSubclassSheetEffects } = createAdapterBindings(registry, context);

  registerSubclassSheetActions('Barbarian_Elements', [
    { name: 'Icefury', cat: 'bonus', minLevel: 3, rollers: [{ kind: 'damage', formula: rageDice(8), label: ({ formula }) => `${formula} cold` }] },
    { name: 'Lava Burst', cat: 'bonus', minLevel: 3, rollers: [{ kind: 'damage', formula: rageDice(4), label: ({ formula }) => `${formula} fire` }], inlinePills: elementsSaveDc },
    { name: 'Lightning Bolt', cat: 'bonus', minLevel: 3, rollers: [{ kind: 'damage', formula: rageDice(6), label: ({ formula }) => `${formula} lightning` }], inlinePills: elementsSaveDc },
  ]);
  registerSubclassSheetEffects('Barbarian_Elements', [
    { type: 'resistance', damageTypes: ['Cold', 'Fire', 'Lightning'], minLevel: 10, condition: raging, note: 'Primordial Bond' },
  ]);
}
