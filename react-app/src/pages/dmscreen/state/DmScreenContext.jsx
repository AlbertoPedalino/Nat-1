import { createContext, useCallback, useContext, useMemo, useReducer } from 'react';
import { createNote } from '../notes/notes.js';
import { makeNoteId } from './storage.js';
import { useDmScreenPersistence } from './useDmScreenPersistence.js';
import { createInitialState, dmScreenReducer } from './reducer.js';

const DmScreenContext = createContext(null);

export function DmScreenProvider({ instanceId, children }) {
  const [state, dispatch] = useReducer(dmScreenReducer, undefined, createInitialState);
  useDmScreenPersistence({ instanceId, notes: state.notes, dispatch });

  const addNewNote = useCallback(() => {
    const note = createNote(makeNoteId());
    dispatch({ type: 'addNote', note });
    return note.id;
  }, []);

  const value = useMemo(() => ({
    state,
    dispatch,
    instanceId,
    addNewNote,
  }), [state, instanceId, addNewNote]);

  return <DmScreenContext.Provider value={value}>{children}</DmScreenContext.Provider>;
}

export function useDmScreen() {
  const context = useContext(DmScreenContext);
  if (!context) throw new Error('useDmScreen must be used within DmScreenProvider.');
  return context;
}
