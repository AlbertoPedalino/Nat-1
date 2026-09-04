import { installSpellDataAdapter } from '../spellAdapterHelpers.js';

export default function install(registry, context = {}) {
  installSpellDataAdapter(registry, context, 'Wither and Bloom', { icon: 'flower-2', saveAbility: 'con', dmgType: 'necrotic' });
}
