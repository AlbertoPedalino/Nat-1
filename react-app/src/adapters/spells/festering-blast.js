import { installSpellDataAdapter } from '../spellAdapterHelpers.js';

export default function install(registry, context = {}) {
  installSpellDataAdapter(registry, context, 'Festering Blast', { icon: 'skull', saveAbility: 'con', dmgType: 'necrotic' });
}
