import { act, renderHook } from '@testing-library/react';
import { useState } from 'react';
import { expect, test, vi } from 'vitest';
import { adapterRegistry } from '../../../../../src/adapters/index.js';
import { useResourceSideEffects } from '../../../../../src/pages/charsheet/actions/useResourceSideEffects.js';
import installDruid from '../../../../../src/adapters/classes/druid/druid.js';

// Three 1st- and two 2nd-level slots, no Pact Magic.
vi.mock('../../../../../src/shared/character/spells/spellcasting.js', async (importOriginal) => ({
  ...(await importOriginal()),
  getSpellSlots: () => ({ regular: [3, 2], pact: null }),
}));

adapterRegistry.registerResourceSideEffect('test_sorc_pts', () => ({
  type: 'create_spell_slot_from_points', label: 'Create Spell Slot', currentSP: 3,
  conversionTable: { 1: 2, 2: 3, 3: 5 }, sourceResourceKey: 'test_sorc_pts',
}));
installDruid(adapterRegistry);

function setup({ resources, resMaxMap, sheet = { spellSlotUsed: {}, createdSpellSlots: {} } }) {
  const onShowToast = vi.fn();
  const onNotice = vi.fn();
  const onUpdateSheet = vi.fn();
  const onUpdateCharacter = vi.fn();
  const { result } = renderHook(() => {
    const [res, setRes] = useState(resources);
    const hook = useResourceSideEffects({
      C: { name: 'Caster' }, sheet, resources: res, setResources: setRes, onShowToast, onNotice, onUpdateSheet, onUpdateCharacter,
      resMaxMap, resNameMap: {},
    });
    return { res, ...hook };
  });
  return { result, onShowToast, onNotice, onUpdateSheet };
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

// Wild Resurgence (Druid 5): a Wild Shape use for a level 1 slot, once per
// Long Rest; a spell slot for a Wild Shape use, only with none left.
test('Wild Resurgence: its Long Rest use turns a Wild Shape use into a level 1 slot', () => {
  const { result, onUpdateSheet } = setup({
    resources: { wild_resurgence: 1, wild_shape: 2 }, resMaxMap: { wild_resurgence: 1, wild_shape: 2 },
  });
  act(() => result.current.handleResChange('wild_resurgence', -1));
  expect(result.current.res).toEqual({ wild_resurgence: 0, wild_shape: 1 });
  expect(onUpdateSheet).toHaveBeenCalledWith({ createdSpellSlots: { 1: 1 } });
});

test('Wild Resurgence: with no Wild Shape use to expend, its Long Rest use is given back', () => {
  const { result, onUpdateSheet, onNotice } = setup({
    resources: { wild_resurgence: 1, wild_shape: 0 }, resMaxMap: { wild_resurgence: 1, wild_shape: 2 },
  });
  act(() => result.current.handleResChange('wild_resurgence', -1));
  expect(result.current.res).toEqual({ wild_resurgence: 1, wild_shape: 0 });
  expect(onUpdateSheet).not.toHaveBeenCalled();
  expect(onNotice).toHaveBeenCalled();
});

test('Wild Resurgence: a picked spell slot buys a Wild Shape use only when none is left', () => {
  const resMaxMap = { wild_shape: 2 };
  const withUse = setup({ resources: { wild_shape: 1 }, resMaxMap });
  act(() => withUse.result.current.handleEffect('wild_resurgence_shape'));
  expect(withUse.result.current.dialogs.spendSlotRecoverDialog).toBe(null);
  expect(withUse.onNotice).toHaveBeenCalledWith('Wild Resurgence', 'Only when you have no uses of Wild Shape left.');

  const { result, onUpdateSheet } = setup({ resources: { wild_shape: 0 }, resMaxMap });
  act(() => result.current.handleEffect('wild_resurgence_shape'));
  expect(result.current.dialogs.spendSlotRecoverDialog.levels.map((l) => l.level)).toEqual([1, 2]);
  act(() => result.current.dialogs.setSpendSlotRecoverSelection(2));
  act(() => result.current.dialogs.confirmSpendSlotRecover());
  expect(onUpdateSheet).toHaveBeenCalledWith({ spellSlotUsed: { 2: 1 } });
  expect(result.current.res).toEqual({ wild_shape: 1 });
});

// Font of Inspiration (Bard 5): a spell slot for a Bardic Inspiration use, as
// often as there are slots; with every use left, it says so.
test('Font of Inspiration: a spell slot for a Bardic Inspiration use, none while all are left', async () => {
  const { default: installBard } = await import('../../../../../src/adapters/classes/bard/bard.js');
  installBard(adapterRegistry);
  const resMaxMap = { bardic_insp: 3 };
  const full = setup({ resources: { bardic_insp: 3 }, resMaxMap });
  act(() => full.result.current.handleEffect('bard_font_insp'));
  expect(full.result.current.dialogs.spendSlotRecoverDialog).toBe(null);
  expect(full.onNotice).toHaveBeenCalled();

  const { result } = setup({ resources: { bardic_insp: 1 }, resMaxMap });
  act(() => result.current.handleEffect('bard_font_insp'));
  act(() => result.current.dialogs.setSpendSlotRecoverSelection(1));
  act(() => result.current.dialogs.confirmSpendSlotRecover());
  expect(result.current.res).toEqual({ bardic_insp: 2 });
});
