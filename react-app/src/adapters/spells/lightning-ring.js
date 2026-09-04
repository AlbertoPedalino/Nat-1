import { installSpellDataAdapter } from '../spellAdapterHelpers.js';

export default function install(registry, context = {}) {
  installSpellDataAdapter(registry, context, 'Lightning Ring', { icon: 'zap', saveAbility: 'dex', dmgType: 'lightning', concentration: true });
}
