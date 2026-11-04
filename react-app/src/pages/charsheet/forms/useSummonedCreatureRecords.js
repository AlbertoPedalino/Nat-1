import { useEffect, useState } from 'react';
import { loadSummonedCreatureRecords } from '../../../shared/character/forms/summonedCreatures.js';

// The summoned-creature bestiary for a sheet panel: { records, status } with
// status 'loading' | 'ready' | 'error'. The loader is cached per tab, so every
// panel shares one fetch.
export function useSummonedCreatureRecords() {
  const [records, setRecords] = useState([]);
  const [status, setStatus] = useState('loading');
  useEffect(() => {
    let alive = true;
    loadSummonedCreatureRecords()
      .then((result) => {
        if (!alive) return;
        setRecords(result || []);
        setStatus('ready');
      })
      .catch(() => {
        if (!alive) return;
        setRecords([]);
        setStatus('error');
      });
    return () => { alive = false; };
  }, []);
  return { records, status };
}
