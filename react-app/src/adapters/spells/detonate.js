import { installSpellDataAdapter } from '../spellAdapterHelpers.js';

export default function install(registry, context = {}) {
  installSpellDataAdapter(registry, context, 'Detonate', { icon: 'flame', saveAbility: 'con', dmgType: 'fire' });
}
