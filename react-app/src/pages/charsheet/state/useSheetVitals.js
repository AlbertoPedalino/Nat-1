import { useCallback, useMemo } from 'react';
import { clampExhaustion, exhaustionD20Penalty } from '../../../shared/character/sheet/sheetStats.js';
import { clampDeathSaveCount, maxHpFor } from '../../../shared/character/combat/vitals.js';
import { applyVitalCommand } from '../../../shared/character/combat/vitalCommands.js';
import { rollDie } from '../../../shared/character/dice/dice.js';

// The sheet's vitals handlers: hit points, temporary and bonus HP, death saves,
// Exhaustion, conditions, reminders and Inspiration.
//
// Every change is a named health command worked out by applyVitalCommand —
// the same function the cloud commit and the battle map use — so the sheet
// shows at once exactly what the digest then confirms, and a concurrent change
// from the map or the encounter builder is merged rather than overwritten.
export function useSheetVitals({ sheet, setSheet, persist, showDiceToast, showNotice }) {
  // `extra` carries sheet fields that travel with the change but are not
  // synced vitals (the Exhaustion level). Returns the new vitals.
  const commit = useCallback((command, extra = {}) => {
    if (!sheet) return null;
    const vitals = applyVitalCommand(sheet, command, sheet.baseMaxHP);
    const patch = { ...vitals, ...extra };
    setSheet({ ...sheet, ...patch, maxHP: maxHpFor(sheet.baseMaxHP, vitals.maxHPBonus) });
    persist(patch, { command });
    return vitals;
  }, [sheet, setSheet, persist]);

  const adjustHP = useCallback((dir, amount = 1) => {
    const step = Math.max(1, Math.floor(amount || 1));
    commit({ type: 'modifyHp', delta: dir > 0 ? step : -step });
  }, [commit]);

  const adjustTempHP = useCallback((dir) => commit({ type: 'modifyTempHp', delta: dir }), [commit]);
  const adjustMaxHpBonus = useCallback((dir) => commit({ type: 'modifyMaxHp', delta: dir }), [commit]);
  const setCurrentHP = useCallback((next) => commit({ type: 'setHp', value: parseInt(next, 10) || 0 }), [commit]);
  const setTempHP = useCallback((next) => commit({ type: 'setTempHp', value: parseInt(next, 10) || 0 }), [commit]);
  const setMaxHpBonus = useCallback((next) => commit({ type: 'setMaxHpBonus', value: parseInt(next, 10) || 0 }), [commit]);
  const setDeathSave = useCallback(
    (type, count) => commit({ type: 'setDeathSave', saveType: type, value: clampDeathSaveCount(count) }),
    [commit],
  );

  const rollDeathSave = useCallback(() => {
    if (!sheet) return;
    if (sheet.currentHP > 0) {
      showNotice('Death Save', 'Available only at 0 HP');
      return;
    }
    if (sheet.deathSaves.success >= 3 || sheet.deathSaves.fail >= 3) {
      showNotice('Death Save', sheet.deathSaves.success >= 3 ? 'Already stable' : 'Character is dead');
      return;
    }
    const roll = rollDie(20);
    // A death saving throw is a D20 Test, so Exhaustion (−2/level) lowers the total
    // versus DC 10. The natural die still governs the crit (1 → two fails, 20 →
    // regain 1 HP) regardless of the penalty.
    const penalty = exhaustionD20Penalty(sheet.exhaustionLevel);
    const total = roll - penalty;
    const { deathSaves } = commit({ type: 'deathSaveRoll', roll, total });
    if (roll === 20) {
      showDiceToast('Death Save', 'Critical success: regain 1 HP', roll, [{ v: roll, faces: 20 }]);
      return;
    }
    let outcome = `${deathSaves.success} success / ${deathSaves.fail} fail`;
    if (deathSaves.success >= 3) outcome = 'Stable (0 HP).';
    else if (deathSaves.fail >= 3) outcome = 'Dead.';
    showDiceToast('Death Save', outcome + (penalty ? ` (Exhaustion −${penalty})` : ''), total, [{ v: roll, faces: 20 }]);
  }, [sheet, commit, showDiceToast, showNotice]);

  // Exhaustion is graded (1–6): the level is the sheet's own field, the
  // condition and level 6's death are the command's.
  const setExhaustion = useCallback((level) => {
    const lvl = clampExhaustion(level);
    commit({ type: 'setExhaustion', value: lvl }, { exhaustionLevel: lvl });
  }, [commit]);

  const toggleCondition = useCallback((key) => {
    if (!sheet) return;
    // Exhaustion toggles between level 0 and 1; the stepper sets exact levels.
    if (key === 'exhaustion') {
      setExhaustion(sheet.activeConditions.includes('exhaustion') ? 0 : 1);
      return;
    }
    commit({ type: 'toggleCombatantCondition', key });
  }, [sheet, commit, setExhaustion]);

  const clearConditions = useCallback(
    () => commit({ type: 'clearCombatantConditions', clearExhaustion: true }, { exhaustionLevel: 0 }),
    [commit],
  );

  // Reminders: the encounter builder's own command names.
  const effectActions = useMemo(() => ({
    add: (text) => commit({ type: 'addCombatantEffect', payload: { text } }),
    remove: (id) => commit({ type: 'removeCombatantEffect', effectId: id }),
    clear: () => commit({ type: 'clearCombatantEffects' }),
  }), [commit]);

  const toggleInspiration = useCallback(() => {
    if (!sheet) return;
    const next = !sheet.sheetInspiration;
    setSheet({ ...sheet, sheetInspiration: next });
    persist({ inspiration: next });
  }, [sheet, setSheet, persist]);

  return {
    adjustHP,
    adjustTempHP,
    adjustMaxHpBonus,
    setCurrentHP,
    setTempHP,
    setMaxHpBonus,
    setDeathSave,
    rollDeathSave,
    setExhaustion,
    toggleCondition,
    clearConditions,
    effectActions,
    toggleInspiration,
  };
}
