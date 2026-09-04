import { installSpellDataAdapter } from '../spellAdapterHelpers.js';

export default function install(registry, context = {}) {
  installSpellDataAdapter(registry, context, 'Uncertain Footing', { icon: 'footprints', saveAbility: 'int', concentration: true });
}
