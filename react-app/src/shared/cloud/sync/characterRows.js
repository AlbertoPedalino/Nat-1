export const CHARACTER_ROW_EVENT = 'gb:character-row';

// RPC responses and realtime share the same server revision. A late response
// must not send a view backwards after a more recent realtime event.
export function publishCharacterRow(row) {
  if (row?.id && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(CHARACTER_ROW_EVENT, { detail: row }));
  }
}
