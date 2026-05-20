import { createContext, useContext, useMemo } from 'react';
import { collectEquipmentProficiencySets } from '../logic/proficiency/index.js';

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
