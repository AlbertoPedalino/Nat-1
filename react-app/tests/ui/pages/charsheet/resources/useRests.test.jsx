import { act, renderHook } from '@testing-library/react';
import { useState } from 'react';
import { expect, test, vi } from 'vitest';
import { useRests } from '../../../../../src/pages/charsheet/resources/useRests.js';

const C = {
  name: 'Hero', className: 'Fighter', classLevel: 3, level: 3,
  scoreMethod: 'manual', manualScores: { str: 14, dex: 10, con: 14, int: 10, wis: 10, cha: 10 },
};
const SHEET = {
  currentHP: 4, maxHP: 28, baseMaxHP: 28, tempHP: 5, maxHPBonus: 0, usedHD: 2, usedHDPools: { Fighter: 2 },
  deathSaves: { success: 1, fail: 1 }, spellSlotUsed: { 1: 1 }, createdSpellSlots: {},
  exhaustionLevel: 2, activeConditions: ['exhaustion', 'dead'], sheetInventory: [],
};

function setup() {
  const persist = vi.fn();
  const showDiceToast = vi.fn();
  const showNotice = vi.fn();
  const { result } = renderHook(() => {
    const [sheet, setSheet] = useState(SHEET);
    const [resources, setResources] = useState({});
    const [freeCastUses, setFreeCastUses] = useState({});
    const rest = useRests({ C, sheet, setSheet, resources, setResources, freeCastUses, setFreeCastUses, persist, showDiceToast, showNotice });
    return { sheet, rest };
  });
  return { result, persist, showNotice };
}

test('a Long Rest restores HP, Hit Dice and slots, lowers Exhaustion by one and closes the dialog', () => {
  const { result, persist, showNotice } = setup();
  act(() => result.current.rest.openLongRest());
  expect(result.current.rest.longRestOpen).toBe(true);
  act(() => result.current.rest.confirmLongRest());
  expect(result.current.sheet).toMatchObject({
    currentHP: 28, tempHP: 0, usedHD: 0, usedHDPools: {}, spellSlotUsed: {},
    deathSaves: { success: 0, fail: 0 }, exhaustionLevel: 1,
  });
  expect(result.current.sheet.activeConditions).toEqual(['exhaustion']);
  expect(persist).toHaveBeenCalledWith(
    expect.objectContaining({ currentHP: 28, spellSlotsUsed: {}, exhaustionLevel: 1 }),
    { command: { type: 'longRest', exhaustionLevel: 1 } },
  );
  expect(result.current.rest.longRestOpen).toBe(false);
  expect(showNotice).toHaveBeenCalledWith('Long Rest', 'Fully restored!');
});

test('a Short Rest without Hit Dice heals nothing but still recharges', () => {
  const { result, persist, showNotice } = setup();
  act(() => result.current.rest.openShortRest());
  act(() => result.current.rest.confirmShortRest());
  expect(result.current.sheet.currentHP).toBe(4);
  expect(persist).toHaveBeenCalledWith(
    expect.objectContaining({ resources: expect.any(Object), freeCastUses: expect.any(Object) }),
    { command: { type: 'modifyHp', delta: 0 } },
  );
  expect(showNotice).toHaveBeenCalledWith('Short Rest', 'Short Rest complete (no Hit Dice spent).');
});
