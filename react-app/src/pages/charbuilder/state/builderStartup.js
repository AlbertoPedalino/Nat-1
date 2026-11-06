import { initialBuilderState } from './initialState.js';
import { normalizeCharacterLevels } from './choiceCleanup.js';
import {
  getActiveCharId,
  loadCharacter as storeLoadCharacter,
  setActiveCharId,
} from '../../../shared/character/profile/store.js';
import { NEW_CHARACTER, characterIdFromUrl } from '../../../shared/character/profile/characterRoutes.js';

// The builder's first state: the character named in the URL, or else the
// active one, from the local store. A cloud character replaces it once pulled.
export function createInitialBuilderState() {
  const charParam = characterIdFromUrl();
  if (charParam === NEW_CHARACTER) return initialBuilderState;
  const targetId = (charParam && charParam !== 'new') ? charParam : getActiveCharId();
  if (!targetId) return initialBuilderState;
  const stored = storeLoadCharacter(targetId);
  if (!stored) return initialBuilderState;
  return {
    ...initialBuilderState,
    character: { ...initialBuilderState.character, ...normalizeCharacterLevels(stored) },
  };
}

// Points the local store's active id at the character the builder opened, or
// clears it for a new one, so local autosave writes to the right record.
export function ensureActiveCharacter() {
  const charParam = characterIdFromUrl();

  if (charParam === 'new') {
    setActiveCharId(null);
    return;
  }

  if (charParam && charParam !== 'new') {
    const stored = storeLoadCharacter(charParam);
    if (stored) {
      setActiveCharId(charParam);
      return;
    }
  }

  if (charParam !== 'new') {
    const activeId = getActiveCharId();
    if (activeId && storeLoadCharacter(activeId)) {
      setActiveCharId(activeId);
      return;
    }
  }

  setActiveCharId(null);
}
