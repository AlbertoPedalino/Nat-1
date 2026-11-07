import { useCallback, useMemo } from 'react';
import { normalizeCharacterAttunement } from '../inventory/attunement.js';

const ignore = () => {};

// How the sheet is edited: each update writes the visible sheet state and the
// character through `persist`, and `actions` is what the tab/card tree gets
// through SheetActionsContext — dice and toasts always, every data change a
// no-op on a read-only sheet.
export function useSheetEditors({
  C, setSheet, setResources, setFreeCastUses, persist, syncSheet, rollD20, showDiceToast, readOnly,
}) {
  const updateCurrentCharacter = useCallback((updater) => {
    if (!C) return;
    const next = typeof updater === 'function' ? updater(C) : updater;
    const patch = Object.fromEntries(Object.entries(next).filter(([key, value]) => JSON.stringify(value) !== JSON.stringify(C[key])));
    persist(patch, Object.hasOwn(patch, 'tempHP') ? { command: { type: 'grantTempHp', value: patch.tempHP } } : {});
  }, [C, persist]);

  const updateInventory = useCallback((inventory) => {
    const normalized = normalizeCharacterAttunement(C, inventory);
    setSheet((prev) => ({ ...prev, sheetInventory: normalized }));
    updateCurrentCharacter((prev) => ({ ...prev, inventory: normalized }));
  }, [C, updateCurrentCharacter]);

  const updateCurrency = useCallback((currency) => {
    setSheet((prev) => ({ ...prev, sheetCurrency: currency }));
    updateCurrentCharacter((prev) => ({ ...prev, currency }));
  }, [updateCurrentCharacter]);

  const updateSpells = useCallback((nextSpellData) => {
    updateCurrentCharacter((prev) => ({ ...prev, ...nextSpellData }));
  }, [updateCurrentCharacter]);

  const saveResourcesState = useCallback((next) => {
    setResources(next);
    persist({ resources: next });
  }, [persist]);

  const updateXp = useCallback((val) => {
    const xp = parseInt(val) || 0;
    setSheet((prev) => ({ ...prev, xpStored: xp }));
    updateCurrentCharacter((prev) => ({ ...prev, xp }));
  }, [updateCurrentCharacter]);

  const updateNotes = useCallback((val) => {
    setSheet((prev) => ({ ...prev, notes: val }));
    persist({ notes: val });
  }, [persist]);

  const toggleFreeCast = useCallback((freeCast) => {
    setFreeCastUses((prev) => {
      const used = Math.max(0, Number(prev?.[freeCast.id] || 0));
      const max = Math.max(1, Number(freeCast.max || 1));
      const next = { ...(prev || {}) };
      if (used >= max) delete next[freeCast.id];
      else next[freeCast.id] = used + 1;
      persist({ freeCastUses: next });
      return next;
    });
  }, [persist]);

  // Stable, cross-cutting handlers shared with the deep tab/card tree via context.
  const sheetActions = useMemo(() => ({
    onRoll: rollD20,
    onShowToast: showDiceToast,
    setResources: saveResourcesState,
    onUpdateInventory: updateInventory,
    onUpdateCurrency: updateCurrency,
    onUpdateSpells: updateSpells,
    onUpdateSheet: syncSheet,
    onUpdateNotes: updateNotes,
    onUpdateCharacter: updateCurrentCharacter,
    onToggleFreeCast: toggleFreeCast,
  }), [
    rollD20, showDiceToast, saveResourcesState, updateInventory, updateCurrency,
    updateSpells, syncSheet, updateNotes, updateCurrentCharacter, toggleFreeCast,
  ]);

  // Read-only keeps navigation + dice rolls, but every data mutation becomes a
  // no-op (no spending slots, no adding items/spells, no HP/condition changes).
  const effectiveActions = useMemo(() => (
    readOnly
      ? {
          ...sheetActions,
          readOnly: true,
          setResources: ignore,
          onUpdateInventory: ignore,
          onUpdateCurrency: ignore,
          onUpdateSpells: ignore,
          onUpdateSheet: ignore,
          onUpdateNotes: ignore,
          onUpdateCharacter: ignore,
          onToggleFreeCast: ignore,
        }
      : { ...sheetActions, readOnly: false }
  ), [readOnly, sheetActions]);

  return { updateCurrentCharacter, saveResourcesState, updateXp, actions: effectiveActions };
}
