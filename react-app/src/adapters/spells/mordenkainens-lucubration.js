import { installSpellDataAdapter } from '../spellAdapterHelpers.js';

export default function install(registry, context = {}) {
  installSpellDataAdapter(registry, context, "Mordenkainen's Lucubration", { icon: 'book-open' });
}
