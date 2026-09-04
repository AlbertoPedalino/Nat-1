import { installSpellDataAdapter } from '../spellAdapterHelpers.js';

export default function install(registry, context = {}) {
  installSpellDataAdapter(registry, context, 'Inflict Doubt', { icon: 'brain', saveAbility: 'wis', concentration: true });
}
