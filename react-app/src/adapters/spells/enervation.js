import { installSpellDataAdapter } from '../spellAdapterHelpers.js';

export default function install(registry, context = {}) {
  installSpellDataAdapter(registry, context, 'Enervation', { icon: 'heart-pulse', saveAbility: 'dex', dmgType: 'necrotic', concentration: true });
}
