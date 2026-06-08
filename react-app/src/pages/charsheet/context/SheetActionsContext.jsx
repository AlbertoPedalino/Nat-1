import { createContext, useContext } from 'react';

// Cross-cutting, stable sheet callbacks (updates, persistence, toast, roll).
// Provided once by CharacterSheet and consumed by the deep tab/card/renderer
// tree via useSheetActions(), so these handlers no longer have to be drilled
// through TabsPanel → ActionsTab → cards. Data (C, sheet, resources) stays in
// props; only the memoised handler bag lives here.
const SheetActionsContext = createContext(null);

export function SheetActionsProvider({ value, children }) {
  return <SheetActionsContext.Provider value={value}>{children}</SheetActionsContext.Provider>;
}

export function useSheetActions() {
  const ctx = useContext(SheetActionsContext);
  if (!ctx) {
    throw new Error('useSheetActions must be used within a SheetActionsProvider');
  }
  return ctx;
}
