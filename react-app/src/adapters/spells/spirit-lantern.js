import { installSpellDataAdapter } from '../spellAdapterHelpers.js';

export default function install(registry, context = {}) {
  installSpellDataAdapter(registry, context, 'Spirit Lantern', { icon: 'lamp', saveAbility: 'con', dmgType: 'necrotic' });
}
