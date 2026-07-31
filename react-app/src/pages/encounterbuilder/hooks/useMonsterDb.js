import { useEffect, useState } from 'react';
import { loadMonsterDatabase } from '../logic/bestiary.js';

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
            error: error?.message || 'Failed to load bestiary.',
          }));
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
