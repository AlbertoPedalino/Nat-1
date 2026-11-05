import { act, renderHook } from '@testing-library/react';
import { useState } from 'react';
import { expect, test, vi } from 'vitest';
import { useSheetVitals } from '../../../../../src/pages/charsheet/state/useSheetVitals.js';
import { effectId } from '../../../../../src/shared/character/combat/combatEffects.js';

const BASE_SHEET = {
  currentHP: 10, maxHP: 20, tempHP: 3, maxHPBonus: 0,
  deathSaves: { success: 0, fail: 0 }, activeConditions: [], exhaustionLevel: 0, activeEffects: [],
};

function setup(sheetOverrides = {}) {
  const persist = vi.fn();
  const showDiceToast = vi.fn();
  const showNotice = vi.fn();
  const { result } = renderHook(() => {
    const [sheet, setSheet] = useState({ ...BASE_SHEET, ...sheetOverrides });
    const vitals = useSheetVitals({ C: { name: 'Hero' }, sheet, setSheet, persist, showDiceToast, showNotice });
    return { sheet, vitals };
  });
  return { result, persist, showDiceToast, showNotice };
}

test('damage spends temporary HP first and is sent as a health command', () => {
  const { result, persist } = setup();
  act(() => result.current.vitals.adjustHP(-1, 5));
  expect(result.current.sheet).toMatchObject({ tempHP: 0, currentHP: 8 });
  expect(persist).toHaveBeenLastCalledWith(
    expect.objectContaining({ currentHP: 8, tempHP: 0 }),
    { command: { type: 'modifyHp', delta: -5 } },
  );
});

test('healing from 0 HP clears death saves and the Dead condition', () => {
  const { result } = setup({ currentHP: 0, deathSaves: { success: 1, fail: 2 }, activeConditions: ['dead'] });
  act(() => result.current.vitals.adjustHP(1, 4));
  expect(result.current.sheet.currentHP).toBe(4);
  expect(result.current.sheet.deathSaves).toEqual({ success: 0, fail: 0 });
  expect(result.current.sheet.activeConditions).not.toContain('dead');
});

test('a third failed death save marks the character dead', () => {
  const { result, persist } = setup({ currentHP: 0, deathSaves: { success: 0, fail: 2 } });
  act(() => result.current.vitals.setDeathSave('fail', 3));
  expect(result.current.sheet.activeConditions).toContain('dead');
  expect(persist).toHaveBeenLastCalledWith(
    expect.objectContaining({ currentHP: 0 }),
    { command: { type: 'setDeathSave', saveType: 'fail', value: 3 } },
  );
});

test('a death save above 0 HP is refused with a notice', () => {
  const { result, persist, showNotice } = setup();
  act(() => result.current.vitals.rollDeathSave());
  expect(showNotice).toHaveBeenCalledWith('Death Save', 'Available only at 0 HP');
  expect(persist).not.toHaveBeenCalled();
});

test('Exhaustion 6 drops to 0 HP and is death; level 0 removes the condition', () => {
  const { result } = setup();
  act(() => result.current.vitals.setExhaustion(6));
  expect(result.current.sheet).toMatchObject({ exhaustionLevel: 6, currentHP: 0 });
  expect(result.current.sheet.activeConditions).toEqual(expect.arrayContaining(['exhaustion', 'dead']));
  act(() => result.current.vitals.setExhaustion(0));
  expect(result.current.sheet.activeConditions).not.toContain('exhaustion');
});

test('reminders are added and removed through named commands', () => {
  const { result, persist } = setup();
  act(() => result.current.vitals.effectActions.add('Bless'));
  const [reminder] = result.current.sheet.activeEffects;
  expect(persist).toHaveBeenLastCalledWith(expect.anything(), { command: { type: 'addCombatantEffect', payload: { text: 'Bless' } } });
  act(() => result.current.vitals.effectActions.remove(effectId(reminder)));
  expect(result.current.sheet.activeEffects).toEqual([]);
});
