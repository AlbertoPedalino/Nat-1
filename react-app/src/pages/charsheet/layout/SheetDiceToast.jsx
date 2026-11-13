import DiceToast from '../../../shared/character/dice/DiceToast.jsx';
import { useStoreValue } from '../../../shared/valueStore.js';

// The sheet's dice toast: the last roll or notice, read from its store
// (useSheetRolls), so showing and closing it redraws this toast alone.
// A sheet that leaves its rolls to the map's toast still shows its notices.
export default function SheetDiceToast({ toastStore, showOwnRollToast }) {
  const toast = useStoreValue(toastStore);
  if (!toast || !(showOwnRollToast || toast.notice)) return null;
  return <DiceToast toast={toast} onClose={() => toastStore.set(null)} />;
}
