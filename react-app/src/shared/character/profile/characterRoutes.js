// Where a character opens: the sheet and the builder take its id as `?char=`,
// and the builder takes `?char=new` for a new character.

export const NEW_CHARACTER = 'new';

export function characterSheetPath(id) {
  return id ? `/charsheet?char=${encodeURIComponent(id)}` : '/charsheet';
}

export function characterBuilderPath(id = NEW_CHARACTER) {
  return `/charbuilder?char=${encodeURIComponent(id || NEW_CHARACTER)}`;
}

// A campaign character's sheet, by its cloud id; `edit` opens it editable.
export function campaignSheetPath(id, { edit = false } = {}) {
  return `/campaign-sheet?id=${encodeURIComponent(id)}${edit ? '&edit=1' : ''}`;
}

// The same page as a link under the app's base path (opened in a new tab).
export function campaignSheetUrl(id, options) {
  return `${import.meta.env.BASE_URL.replace(/\/+$/, '')}${campaignSheetPath(id, options)}`;
}

// The `?char=` of the current page, or null.
export function characterIdFromUrl() {
  return new URLSearchParams(window.location.search).get('char');
}

// Rewrites the current page's `?char=` in place, without a navigation.
export function replaceCharacterIdInUrl(id) {
  window.history.replaceState(null, '', `${window.location.pathname}?char=${encodeURIComponent(id)}`);
}
