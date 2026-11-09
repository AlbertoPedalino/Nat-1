import { useEffect, useState } from 'react';
import { loadMonsterDatabase } from './bestiary.js';
import { failureMessage } from '../ui/busyAction.js';

const initialState = {
  status: 'idle',
  error: null,
  monsters: [],
  availableSources: [],
  sourceOptions: [],
  legendaryGroups: new Map(),
};

export function useMonsterDb() {
  const [state, setState] = useState(initialState);

  useEffect(() => {
    let cancelled = false;
    setState((prev) => ({ ...prev, status: 'loading', error: null }));
    loadMonsterDatabase()
      .then((payload) => {
        if (!cancelled) setState({ status: 'ready', error: null, ...payload });
      })
      .catch((error) => {
        if (!cancelled) {
          setState((prev) => ({
            ...prev,
            status: 'error',
            error: failureMessage('Could not load bestiary.', error),
          }));
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
