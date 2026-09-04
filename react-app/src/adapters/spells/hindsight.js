import { installSpellDataAdapter } from '../spellAdapterHelpers.js';

export default function install(registry, context = {}) {
  installSpellDataAdapter(registry, context, 'Hindsight', { icon: 'eye', concentration: true });
}
