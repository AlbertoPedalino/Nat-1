import { useCallback, useEffect, useRef, useState } from 'react';
import { getCloudCharacter } from '../api/cloudCharacters.js';

// One whole `characters` row, for a view that shows the whole sheet — editable
// or read-only. It is read once on mount. Nothing here follows it: the sheet
// the row is handed to follows the character's sheet revision
// (useCharacterSheetRevision) and its vitals (the character digest), and hands
// back a newer row through `replaceRow` when the content changed. No whole row
// ever arrives over Realtime.

function initialState(id) {
  return id ? { row: null, loading: true, error: '' } : { row: null, loading: false, error: 'No sheet id.' };
}

export function useCloudCharacterRow(charId) {
  const id = charId ? String(charId) : '';
  const [state, setState] = useState(() => initialState(id));
  const current = useRef(id);
  current.current = id;

  useEffect(() => {
    let alive = true;
    setState(initialState(id));
    if (!id) return undefined;
    getCloudCharacter(id, { reason: 'initial-load' })
      .then((row) => {
        if (alive && row?.data && typeof row.data === 'object') setState({ row, loading: false, error: '' });
      })
      .catch((error) => {
        if (alive) setState((prev) => (prev.row ? prev : { row: null, loading: false, error: error?.message || 'Failed to load sheet.' }));
      });
    return () => { alive = false; };
  }, [id]);

  // A newer row of this character (a structural refresh, or the cloud version
  // chosen in a conflict).
  const replaceRow = useCallback((row) => {
    if (!row || String(row.id ?? '') !== current.current || !row.data || typeof row.data !== 'object') return;
    setState({ row, loading: false, error: '' });
  }, []);

  // The character no longer exists.
  const markDeleted = useCallback(() => {
    setState({ row: null, loading: false, error: 'This sheet no longer exists.' });
  }, []);

  return { ...state, replaceRow, markDeleted };
}
