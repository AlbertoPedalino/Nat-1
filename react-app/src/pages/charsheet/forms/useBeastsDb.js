import { loadBeasts, loadFeatureForms } from '../../../shared/content/catalogs/beastData.js';
import { useLoaded } from '../../../shared/ui/useLoaded.js';

// Loads the normalized beast DB for a sheet panel (Wild Shape / Wild Companion).
// loadBeasts is cached per-file by loadGameData, so multiple callers share one
// fetch; this hook just manages the async-to-state plus the unmount guard, which
// both beast panels would otherwise duplicate.
export function useBeastsDb() {
  return useLoaded(loadBeasts, [], { initial: [] }).data;
}

// Wild Shape forms a class feature gives (Bear Form, Cat Form), raw.
export function useFeatureForms() {
  return useLoaded(loadFeatureForms, [], { initial: [] }).data;
}
