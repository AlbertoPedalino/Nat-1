import { createContext, useCallback, useContext, useMemo, useReducer } from 'react';
import { createNote } from '../logic/notes.js';
import { makeNoteId } from '../storage.js';
import { useDmScreenPersistence } from '../hooks/useDmScreenPersistence.js';
import { createInitialState, dmScreenReducer } from './reducer.js';

const DmScreenContext = createContext(null);

export function DmScreenProvider({ instanceId, instanceSaved, linkGroupId, onInstanceSaved, children }) {
  const [state, dispatch] = useReducer(dmScreenReducer, undefined, createInitialState);
  const { saveInstance } = useDmScreenPersistence({
    instanceId,
    instanceSaved,
    linkGroupId,
    notes: state.notes,
    dispatch,
    onSaved: onInstanceSaved,
  });

  const addNewNote = useCallback(() => {
    const note = createNote(makeNoteId());
    dispatch({ type: 'addNote', note });
    return note.id;
  }, []);

  const value = useMemo(() => ({
    state,
    dispatch,
    instanceId,
    instanceSaved,
    saveInstance,
    addNewNote,
  }), [state, instanceId, instanceSaved, saveInstance, addNewNote]);

  return <DmScreenContext.Provider value={value}>{children}</DmScreenContext.Provider>;
}

export function useDmScreen() {
  const context = useContext(DmScreenContext);
  if (!context) throw new Error('useDmScreen must be used within DmScreenProvider.');
  return context;
}
