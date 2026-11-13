import { useCallback, useEffect, useRef, useState } from 'react';
import { useDebouncedCallback } from './useDebouncedCallback.js';

// Text typed into a field whose value lives somewhere costly to change (a
// reducer behind a whole page: the encounter builder, the character builder):
// the field follows the typing at once, the owner gets the text after a pause
// (`delay` ms) or when the field is left (`flush`, for onBlur). A change from
// the owner (a panel emptied by Save) replaces the field's text unless typing
// is still on its way. Answers [text, setText, flush].
export function useDraftText(value, commit, delay = 200) {
  const [text, setText] = useState(value ?? '');
  const pendingRef = useRef(false);
  const commitLater = useDebouncedCallback((next) => {
    pendingRef.current = false;
    commit(next);
  }, delay);

  useEffect(() => {
    if (!pendingRef.current) setText(value ?? '');
  }, [value]);

  const change = useCallback((next) => {
    pendingRef.current = true;
    setText(next);
    commitLater(next);
  }, [commitLater]);

  return [text, change, commitLater.flush];
}
