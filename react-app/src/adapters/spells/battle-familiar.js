import { installSpellDataAdapter } from '../spellAdapterHelpers.js';

export default function install(registry, context = {}) {
  installSpellDataAdapter(registry, context, 'Battle Familiar', {
    
    summonedCreature: { name: 'Battle Familiar', source: 'AU', minimumSpellLevel: 2 },
  });
}
