import { buildD20Meta, formatD20Detail, rollD20, rollFormula } from '../../../shared/character/dice/dice.js';
import { useSheetActions } from '../state/SheetActionsContext.jsx';
import { failureMessage } from '../../../shared/ui/busyAction.js';

// Rolls made by a separate creature (summon, companion): plain dice shown in the
// sheet's toast, never the character's d20 (its exhaustion and conditions are
// not the creature's). `rollCheck(bonus, label)` for d20 tests and attacks,
// `rollFormulaToast(formula, label)` for damage and HP dice.
export function useCreatureRolls() {
  const { onShowToast } = useSheetActions();
  const rollCheck = (bonus, label) => {
    if (!onShowToast) return;
    const result = rollD20(bonus);
    onShowToast(label, formatD20Detail(result), result.total, result.rolls, buildD20Meta(result));
  };
  const rollFormulaToast = (formula, label) => {
    if (!onShowToast) return;
    const result = rollFormula(formula);
    if (!result.valid) {
      onShowToast(label, failureMessage(`Could not roll ${formula}: invalid formula.`, result.error), null, []);
      return;
    }
    onShowToast(label, formula, result.total, result.rolls, result.modifier ? { bonus: result.modifier } : undefined);
  };
  return { rollCheck, rollFormulaToast };
}
