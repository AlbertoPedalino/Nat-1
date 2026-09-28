import { listCharacters, renameCharacter } from '../character/profile/store.js';

// Character registry metadata for the library and home pages. Tool instances
// (GM Board, Encounter Builder, DM Screen) have their own store:
// shared/instances/instanceStore.js.
export const REGISTRY_META = Object.freeze({
  gb_char_registry: {
    label: 'Personaggio',
    route: (id) => `/charsheet?char=${encodeURIComponent(id)}`,
    newRoute: '/charbuilder?char=new',
    custom: true,
  },
});

export function readRegistry(key) {
  return key === 'gb_char_registry' ? listCharacters() : [];
}

export function renameRegistryEntry(registryKey, id, nextName) {
  if (registryKey !== 'gb_char_registry') return false;
  const name = nextName || prompt('Nome salvataggio', id);
  if (!name || !name.trim()) return false;
  renameCharacter(id, name.trim());
  return true;
}
