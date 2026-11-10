import { createAdapterBindings } from '../../adapterBindings.js';
import { saveDcPills } from '../../../shared/character/progression/featureSaveDc.js';
import { spellcastingNumbers } from '../../../shared/character/spells/spellcastingNumbers.js';
import { rageDamageBonus } from './rageDamage.js';

// Path of the Elements (World of Warcraft). Echo of the Elements' spells come
// from the subclass data. Raging Elements use Constitution: Icefury is a spell
// attack with it as the spellcasting ability, the save DCs are 8 + CON + PB.
function rageDice(face) {
  return ({ ownerLevel }) => `${rageDamageBonus(ownerLevel)}d${face}`;
}

function raging(C) { return !!C && C.rageActive === true; }

export default function install(registry, context = {}) {
  const { registerSubclassSheetActions, registerSubclassSheetEffects } = createAdapterBindings(registry, context);

  registerSubclassSheetActions('Barbarian_Elements', [
    { name: 'Icefury', cat: 'bonus', minLevel: 3, attackBonus: ({ character }) => spellcastingNumbers(character, 'con').attack, rollers: [{ kind: 'damage', formula: rageDice(8), label: ({ formula }) => `${formula} cold` }] },
    { name: 'Lava Burst', cat: 'bonus', minLevel: 3, rollers: [{ kind: 'damage', formula: rageDice(4), label: ({ formula }) => `${formula} fire` }], inlinePills: saveDcPills('con') },
    { name: 'Lightning Bolt', cat: 'bonus', minLevel: 3, rollers: [{ kind: 'damage', formula: rageDice(6), label: ({ formula }) => `${formula} lightning` }], inlinePills: saveDcPills('con') },
  ]);
  registerSubclassSheetEffects('Barbarian_Elements', [
    { type: 'resistance', damageTypes: ['Cold', 'Fire', 'Lightning'], minLevel: 10, condition: raging, note: 'Primordial Bond' },
  ]);
}
