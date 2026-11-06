import { useCallback, useMemo } from 'react';
import { computeMaxHp } from '../../../shared/character/combat/hp.js';
import {
  clampExhaustion,
  exhaustionD20Penalty,
  EXHAUSTION_MAX,
} from '../../../shared/character/sheet/sheetStats.js';
import {
  DEAD_CONDITION_KEY,
  setConditionActive,
  toggleCondition as toggleConditionKey,
} from '../../../shared/character/combat/conditions.js';
import { addReminder, removeEffect } from '../../../shared/character/combat/combatEffects.js';
import { clampDeathSaveCount } from '../../../shared/character/combat/vitals.js';
import { rollDie } from '../../../shared/character/dice/dice.js';

// The sheet's vitals handlers: hit points, temporary and bonus HP, death saves,
// Exhaustion, conditions, reminders and Inspiration. Each one updates the sheet
// at once and hands `persist` the patch plus the named health command, so a
// concurrent change from the battle map or the encounter builder is merged.
export function useSheetVitals({ C, sheet, setSheet, persist, showDiceToast, showNotice }) {
  const adjustHP = useCallback((dir, amount = 1) => {
    if (!sheet) return;
    const s = { ...sheet };
    const dmg = Math.max(1, Math.floor(amount || 1));
    if (dir > 0) {
      s.currentHP = Math.min(s.maxHP, s.currentHP + dmg);
    } else {
      let remaining = dmg;
      if (s.tempHP > 0) {
        const absorbed = Math.min(s.tempHP, remaining);
        s.tempHP -= absorbed;
        remaining -= absorbed;
      }
      s.currentHP = Math.max(0, s.currentHP - remaining);
    }
    const patch = { currentHP: s.currentHP, tempHP: s.tempHP, maxHPBonus: s.maxHPBonus };
    if (s.currentHP > 0) {
      s.deathSaves = { success: 0, fail: 0 };
      patch.deathSaves = s.deathSaves;
      s.activeConditions = setConditionActive(s.activeConditions, DEAD_CONDITION_KEY, false);
      patch.activeConditions = s.activeConditions;
    }
    setSheet(s);
    persist(patch, { command: { type: 'modifyHp', delta: dir > 0 ? dmg : -dmg } });
  }, [sheet, persist]);

  const adjustTempHP = useCallback((dir) => {
    if (!sheet) return;
    const s = { ...sheet, tempHP: Math.max(0, sheet.tempHP + dir) };
    setSheet(s);
    persist({ tempHP: s.tempHP }, { command: { type: 'modifyTempHp', delta: dir } });
  }, [sheet, persist]);

  const adjustMaxHpBonus = useCallback((dir) => {
    if (!sheet || !C) return;
    const s = { ...sheet, maxHPBonus: sheet.maxHPBonus + dir };
    const baseMax = Math.max(1, computeMaxHp(C));
    s.maxHP = Math.max(1, baseMax + s.maxHPBonus);
    if (s.currentHP > s.maxHP) s.currentHP = s.maxHP;
    setSheet(s);
    persist({ currentHP: s.currentHP, maxHPBonus: s.maxHPBonus }, { command: { type: 'modifyMaxHp', delta: dir } });
  }, [sheet, C, persist]);

  const setCurrentHP = useCallback((next) => {
    if (!sheet) return;
    const s = { ...sheet, currentHP: Math.max(0, Math.min(sheet.maxHP, parseInt(next) || 0)) };
    const patch = { currentHP: s.currentHP, tempHP: s.tempHP, maxHPBonus: s.maxHPBonus };
    if (s.currentHP > 0) {
      s.deathSaves = { success: 0, fail: 0 };
      patch.deathSaves = s.deathSaves;
      s.activeConditions = setConditionActive(s.activeConditions, DEAD_CONDITION_KEY, false);
      patch.activeConditions = s.activeConditions;
    }
    setSheet(s);
    persist(patch, { command: { type: 'setHp', value: parseInt(next) || 0 } });
  }, [sheet, persist]);

  const setTempHP = useCallback((next) => {
    if (!sheet) return;
    const s = { ...sheet, tempHP: Math.max(0, parseInt(next) || 0) };
    setSheet(s);
    persist({ tempHP: s.tempHP });
  }, [sheet, persist]);

  const setMaxHpBonus = useCallback((next) => {
    if (!sheet || !C) return;
    const bonus = parseInt(next) || 0;
    const baseMax = Math.max(1, computeMaxHp(C));
    const s = { ...sheet, maxHPBonus: bonus, maxHP: Math.max(1, baseMax + bonus) };
    if (s.currentHP > s.maxHP) s.currentHP = s.maxHP;
    setSheet(s);
    persist({ currentHP: s.currentHP, maxHPBonus: s.maxHPBonus }, { command: { type: 'setMaxHpBonus', value: bonus } });
  }, [sheet, C, persist]);

  const setDeathSave = useCallback((type, count) => {
    if (!sheet) return;
    const value = clampDeathSaveCount(count);
    const ds = { ...sheet.deathSaves, [type]: value };
    const dead = ds.fail >= 3;
    const activeConditions = setConditionActive(sheet.activeConditions, DEAD_CONDITION_KEY, dead);
    const patch = { deathSaves: ds, activeConditions, ...(dead ? { currentHP: 0 } : {}) };
    setSheet({ ...sheet, ...patch });
    persist(patch, { command: { type: 'setDeathSave', saveType: type, value } });
  }, [sheet, persist]);

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
    const penaltyNote = penalty ? ` (Exhaustion −${penalty})` : '';
    const ds = { ...sheet.deathSaves };
    let extra = '';
    if (roll === 1) { ds.fail = Math.min(3, ds.fail + 2); }
    else if (roll === 20) {
      ds.success = 0; ds.fail = 0;
      const s = {
        ...sheet,
        deathSaves: ds,
        currentHP: Math.min(sheet.maxHP, 1),
        activeConditions: setConditionActive(sheet.activeConditions, DEAD_CONDITION_KEY, false),
      };
      setSheet(s);
      persist({
        currentHP: s.currentHP,
        tempHP: s.tempHP,
        maxHPBonus: s.maxHPBonus,
        deathSaves: ds,
        activeConditions: s.activeConditions,
      }, { command: { type: 'deathSaveRoll', roll, total } });
      showDiceToast('Death Save', 'Critical success: regain 1 HP', roll, [{ v: roll, faces: 20 }]);
      return;
    } else if (total >= 10) { ds.success = Math.min(3, ds.success + 1); }
    else { ds.fail = Math.min(3, ds.fail + 1); }

    if (ds.success >= 3) extra = 'Stable (0 HP).';
    else if (ds.fail >= 3) extra = 'Dead.';
    else extra = `${ds.success} success / ${ds.fail} fail`;
    const activeConditions = setConditionActive(sheet.activeConditions, DEAD_CONDITION_KEY, ds.fail >= 3);
    const patch = { deathSaves: ds, activeConditions };
    setSheet({ ...sheet, ...patch });
    persist(patch, { command: { type: 'deathSaveRoll', roll, total } });
    showDiceToast('Death Save', extra + penaltyNote, total, [{ v: roll, faces: 20 }]);
  }, [sheet, persist, showDiceToast, showNotice]);

  // Exhaustion is graded (1–6), so it carries a level alongside its presence in
  // activeConditions. Level 0 removes it; >0 keeps the pill and drives penalties.
  const setExhaustion = useCallback((level) => {
    if (!sheet) return;
    const lvl = clampExhaustion(level);
    const present = sheet.activeConditions.includes('exhaustion');
    let next = sheet.activeConditions;
    if (lvl > 0 && !present) next = [...sheet.activeConditions, 'exhaustion'];
    else if (lvl === 0 && present) next = sheet.activeConditions.filter((k) => k !== 'exhaustion');
    const patch = { activeConditions: next, exhaustionLevel: lvl };
    // Level 6 = death (XPHB 2024): drop to 0 HP so the HP panel reflects it.
    if (lvl >= EXHAUSTION_MAX) {
      patch.currentHP = 0;
      patch.activeConditions = setConditionActive(next, DEAD_CONDITION_KEY, true);
    }
    setSheet({ ...sheet, ...patch });
    persist(patch, { command: { type: 'setExhaustion', value: lvl } });
  }, [sheet, persist]);

  const toggleCondition = useCallback((key) => {
    if (!sheet) return;
    // Exhaustion toggles between level 0 and 1; the stepper sets exact levels.
    if (key === 'exhaustion') {
      setExhaustion(sheet.activeConditions.includes('exhaustion') ? 0 : 1);
      return;
    }
    if (key === DEAD_CONDITION_KEY) {
      const dead = !sheet.activeConditions.includes(DEAD_CONDITION_KEY);
      const patch = dead
        ? {
          currentHP: 0,
          deathSaves: { success: 0, fail: 3 },
          activeConditions: setConditionActive(sheet.activeConditions, DEAD_CONDITION_KEY, true),
        }
        : {
          currentHP: Math.min(sheet.maxHP, 1),
          deathSaves: { success: 0, fail: 0 },
          activeConditions: setConditionActive(sheet.activeConditions, DEAD_CONDITION_KEY, false),
        };
      setSheet({ ...sheet, ...patch });
      persist(patch, { command: { type: 'toggleCombatantCondition', key } });
      return;
    }
    // Shared with the encounter builder so both surfaces apply the same
    // implied-condition cascade (Unconscious also grants Incapacitated + Prone).
    const next = toggleConditionKey(sheet.activeConditions, key);
    setSheet({ ...sheet, activeConditions: next });
    persist({ activeConditions: next }, { command: { type: 'toggleCombatantCondition', key } });
  }, [sheet, persist, setExhaustion]);

  const clearConditions = useCallback(() => {
    if (!sheet) return;
    const wasDead = sheet.activeConditions.includes(DEAD_CONDITION_KEY);
    const patch = {
      activeConditions: [],
      exhaustionLevel: 0,
      ...(wasDead ? { currentHP: Math.min(sheet.maxHP, 1), deathSaves: { success: 0, fail: 0 } } : {}),
    };
    setSheet({ ...sheet, ...patch });
    persist(patch, { command: { type: 'clearCombatantConditions', clearExhaustion: true } });
  }, [sheet, persist]);

  // Reminders, a synced vital: each change is committed as the same named
  // command the encounter builder sends, so a concurrent edit from the map or
  // the builder is merged rather than overwritten.
  const changeEffects = useCallback((next, command) => {
    if (!sheet) return;
    setSheet({ ...sheet, activeEffects: next });
    persist({ activeEffects: next }, { command });
  }, [sheet, persist]);

  const effectActions = useMemo(() => ({
    add: (text) => changeEffects(
      addReminder(sheet?.activeEffects, text),
      { type: 'addCombatantEffect', payload: { text } },
    ),
    remove: (id) => changeEffects(removeEffect(sheet?.activeEffects, id), { type: 'removeCombatantEffect', effectId: id }),
  }), [changeEffects, sheet?.activeEffects]);

  const toggleInspiration = useCallback(() => {
    if (!sheet) return;
    const next = !sheet.sheetInspiration;
    setSheet({ ...sheet, sheetInspiration: next });
    persist({ inspiration: next });
  }, [sheet, persist]);

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
