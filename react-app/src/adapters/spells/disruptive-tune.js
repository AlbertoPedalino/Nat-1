import { installSpellDataAdapter } from '../spellAdapterHelpers.js';

export default function install(registry, context = {}) {
  installSpellDataAdapter(registry, context, 'Disruptive Tune', { icon: 'music', saveAbility: 'con', concentration: true });
}
