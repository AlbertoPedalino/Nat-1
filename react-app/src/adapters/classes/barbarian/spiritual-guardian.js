import { createAdapterBindings } from '../../adapterBindings.js';
import { rageDamageBonus } from './rageDamage.js';

// Path of the Spiritual Guardian (World of Warcraft). Consult the Spirits'
// spells come from the subclass data.
export default function install(registry, context = {}) {
  const { registerSubclassSheetActions } = createAdapterBindings(registry, context);

  registerSubclassSheetActions('Barbarian_Spiritual Guardian', [
    { name: 'Spiritual Protectors: Strike', cat: 'special', minLevel: 3, rollers: [{ kind: 'damage', formula: '1d4', label: ({ formula }) => `${formula} cold, fire or lightning` }] },
    {
      name: 'Spirit Shield',
      cat: 'reaction',
      minLevel: 6,
      rollers: [{ kind: 'utility', formula: ({ ownerLevel }) => `${rageDamageBonus(ownerLevel)}d6`, label: 'Damage reduction' }],
    },
  ]);
}
