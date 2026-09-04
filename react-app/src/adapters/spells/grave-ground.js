import { installSpellDataAdapter } from '../spellAdapterHelpers.js';

export default function install(registry, context = {}) {
  installSpellDataAdapter(registry, context, 'Grave Ground', { icon: 'skull', saveAbility: 'str', dmgType: 'necrotic', concentration: true });
}
