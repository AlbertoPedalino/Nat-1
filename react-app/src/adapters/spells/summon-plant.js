import { installSpellDataAdapter } from '../spellAdapterHelpers.js';

export default function install(registry, context = {}) {
  installSpellDataAdapter(registry, context, 'Summon Plant', {
    icon: 'sprout',
    concentration: true,
    summonedCreature: { name: 'Plant Spirit', source: 'AU', minimumSpellLevel: 5 },
  });
}
