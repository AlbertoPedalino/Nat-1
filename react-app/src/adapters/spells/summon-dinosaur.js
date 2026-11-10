import { installSpellDataAdapter } from '../spellAdapterHelpers.js';

export default function install(registry, context = {}) {
  installSpellDataAdapter(registry, context, 'Summon Dinosaur', {
    
    concentration: true,
    summonedCreature: { name: 'Dinosaur Spirit', source: 'AU', minimumSpellLevel: 6 },
  });
}
