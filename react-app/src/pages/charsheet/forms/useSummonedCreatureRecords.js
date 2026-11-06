import { loadSummonedCreatureRecords } from '../../../shared/character/forms/summonedCreatures.js';
import { useLoaded } from '../../../shared/ui/useLoaded.js';

// The summoned-creature bestiary for a sheet panel: { records, status } with
// status 'loading' | 'ready' | 'error'. The loader is cached per tab, so every
// panel shares one fetch.
export function useSummonedCreatureRecords() {
  const { data, status } = useLoaded(loadSummonedCreatureRecords, [], { initial: [] });
  return { records: status === 'error' ? [] : data, status };
}
