import {
  addNote,
  moveNote,
  moveNoteTo,
  removeNote,
  resizeNote,
  updateNote,
} from '../logic/notes.js';

export function createInitialState() {
  return { notes: [], focusNoteId: null };
}

export function dmScreenReducer(state, action) {
  switch (action.type) {
    case 'hydrate':
      return { notes: action.notes, focusNoteId: null };
    case 'addNote':
      return {
        notes: addNote(state.notes, action.note),
        focusNoteId: action.note.id,
      };
    case 'updateNote':
      return {
        ...state,
        notes: updateNote(state.notes, action.id, action.field, action.value),
      };
    case 'removeNote':
      return {
        notes: removeNote(state.notes, action.id),
        focusNoteId: state.focusNoteId === action.id ? null : state.focusNoteId,
      };
    case 'moveNote':
      return { ...state, notes: moveNote(state.notes, action.id, action.offset) };
    case 'moveNoteTo':
      return { ...state, notes: moveNoteTo(state.notes, action.id, action.index) };
    case 'resizeNote':
      return { ...state, notes: resizeNote(state.notes, action.id, action.size) };
    case 'clearFocus':
      return state.focusNoteId ? { ...state, focusNoteId: null } : state;
    default:
      return state;
  }
}
