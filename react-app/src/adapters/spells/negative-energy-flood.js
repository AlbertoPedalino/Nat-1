import { installSpellDataAdapter } from '../spellAdapterHelpers.js';

export default function install(registry, context = {}) {
  installSpellDataAdapter(registry, context, 'Negative Energy Flood', { icon: 'skull', saveAbility: 'con', dmgType: 'necrotic' });
}
