import { installSpellDataAdapter } from '../spellAdapterHelpers.js';

export default function install(registry, context = {}) {
  installSpellDataAdapter(registry, context, 'Fractured Awareness', { icon: 'brain', saveAbility: 'int', dmgType: 'psychic', concentration: true });
}
