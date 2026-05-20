import { createContext, useContext, useMemo } from 'react';
import { collectEquipmentProficiencySets } from '../logic/proficiency/index.js';

// Cross-component memoized equipment proficiency sets.
// Computation runs once per character reference change in the Provider and is
// shared by every descendant that calls useProficiencySets(). Throws hard when
// the hook is invoked outside the Provider so misuse surfaces immediately
// during development rather than silently recomputing per consumer.
const ProficiencySetsContext = createContext(null);

export function ProficiencySetsProvider({ character, children }) {
  const value = useMemo(
    () => collectEquipmentProficiencySets(character),
    [character],
  );
  return (
    <ProficiencySetsContext.Provider value={value}>
      {children}
    </ProficiencySetsContext.Provider>
  );
}

export function useProficiencySets() {
  const value = useContext(ProficiencySetsContext);
  if (!value) {
    throw new Error('useProficiencySets must be used inside <ProficiencySetsProvider>.');
  }
  return value;
}
