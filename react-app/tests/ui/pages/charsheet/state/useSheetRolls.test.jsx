import { act, renderHook } from '@testing-library/react';
import { vi } from 'vitest';
import { useSheetRolls } from '../../../../../src/pages/charsheet/state/useSheetRolls.js';

const channel = vi.hoisted(() => ({ publish: vi.fn() }));
vi.mock('../../../../../src/shared/cloud/sync/useRollChannel.js', () => ({ useRollChannel: () => ({ publish: channel.publish }) }));
vi.mock('../../../../../src/shared/cloud/sync/useCharacterCampaign.js', () => ({ useCharacterCampaign: () => 'campaign' }));

const open = () => renderHook(() => useSheetRolls({ C: { name: 'Elara' }, sheet: {}, charId: 'c1', showOwnRollToast: true }));

test('a gameplay notice shows in the toast but is not a roll: no log, nothing sent to the table', () => {
  const { result } = open();
  act(() => result.current.showNotice('Long Rest', 'Fully restored!'));
  expect(result.current.diceToast).toMatchObject({ label: 'Long Rest', detail: 'Fully restored!', notice: true });
  expect(result.current.rollLog).toEqual([]);
  expect(channel.publish).not.toHaveBeenCalled();
});

test('a roll is logged and sent to the table as public', () => {
  const { result } = open();
  act(() => result.current.showDiceToast('Arcana Check', 'd20 + 2', 14, [{ v: 12, faces: 20 }]));
  expect(result.current.rollLog).toHaveLength(1);
  expect(channel.publish).toHaveBeenCalledWith(expect.objectContaining({ label: 'Arcana Check' }), { visibility: 'public' });
});

test("a roll carries the character's name and colour, and a custom roll is made the map's way", () => {
  const { result } = renderHook(() => useSheetRolls({
    C: { name: 'Elara', classIconColor: '#3a7bd5' }, sheet: {}, charId: 'c1', showOwnRollToast: true,
  }));
  act(() => result.current.rollCustom('2d6+1'));
  const [sent] = channel.publish.mock.calls.at(-1);
  expect(sent).toMatchObject({
    label: expect.stringContaining('Custom Roll'),
    actorName: 'Elara',
    actorColor: '#3a7bd5',
    characterId: 'c1',
    thrown: true,
    meta: { bonus: 1 },
  });
  expect(sent.rolls).toHaveLength(2);
});
