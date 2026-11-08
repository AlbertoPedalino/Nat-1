import { act, renderHook } from '@testing-library/react';
import { useState } from 'react';
import { expect, test, vi } from 'vitest';
import { adapterRegistry } from '../../../../../src/adapters/index.js';
import { useResourceSideEffects } from '../../../../../src/pages/charsheet/actions/useResourceSideEffects.js';

// Three 1st- and two 2nd-level slots, no Pact Magic.
vi.mock('../../../../../src/shared/character/spells/spellcasting.js', async (importOriginal) => ({
  ...(await importOriginal()),
  getSpellSlots: () => ({ regular: [3, 2], pact: null }),
}));

adapterRegistry.registerResourceSideEffect('test_sorc_pts', () => ({
  type: 'create_spell_slot_from_points', label: 'Create Spell Slot', currentSP: 3,
  conversionTable: { 1: 2, 2: 3, 3: 5 }, sourceResourceKey: 'test_sorc_pts',
}));
adapterRegistry.registerResourceSideEffect('test_resurgence', () => ({
  type: 'wild_resurgence', label: 'Wild Resurgence', hasWildShape: true, hasAvailableSlot: true, currentWS: 1,
}));

function setup({ resources, resMaxMap, sheet = { spellSlotUsed: {}, createdSpellSlots: {} } }) {
  const onShowToast = vi.fn();
  const onUpdateSheet = vi.fn();
  const onUpdateCharacter = vi.fn();
  const { result } = renderHook(() => {
    const [res, setRes] = useState(resources);
    const hook = useResourceSideEffects({
      C: { name: 'Caster' }, sheet, resources: res, setResources: setRes, onShowToast, onUpdateSheet, onUpdateCharacter,
      resMaxMap, resNameMap: {},
    });
    return { res, ...hook };
  });
  return { result, onShowToast, onUpdateSheet };
}

test('Font of Magic: spending the points opens the levels they can afford; confirming creates the slot', () => {
  const { result, onUpdateSheet } = setup({ resources: { test_sorc_pts: 4 }, resMaxMap: { test_sorc_pts: 5 } });
  act(() => result.current.handleResChange('test_sorc_pts', -1));
  expect(result.current.res.test_sorc_pts).toBe(3);
  expect(result.current.dialogs.createSlotDialog.levels.map((l) => l.level)).toEqual([1, 2]);
  act(() => result.current.dialogs.setCreateSlotSelection(2));
  act(() => result.current.dialogs.confirmCreateSlot());
  expect(result.current.res.test_sorc_pts).toBe(0);
  expect(onUpdateSheet).toHaveBeenCalledWith({ createdSpellSlots: { 2: 1 } });
  expect(result.current.dialogs.createSlotDialog).toBe(null);
});

test('Wild Resurgence: a spell slot buys back one Wild Shape use, up to its max', () => {
  const { result, onUpdateSheet } = setup({
    resources: { test_resurgence: 1, wild_shape: 1 }, resMaxMap: { test_resurgence: Infinity, wild_shape: 2 },
  });
  act(() => result.current.handleResChange('test_resurgence', -1));
  expect(result.current.dialogs.wildResurgenceDialog.options.map((o) => o.key)).toEqual(['shape_to_slot', 'slot_to_shape']);
  act(() => result.current.dialogs.confirmWildResurgence('slot_to_shape'));
  expect(onUpdateSheet).toHaveBeenCalledWith({ spellSlotUsed: { 1: 1 } });
  expect(result.current.res.wild_shape).toBe(2);
});
