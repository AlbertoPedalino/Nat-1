import { act, renderHook } from '@testing-library/react';
import { beforeEach, vi } from 'vitest';
import { useVttRolls } from './useVttRolls.js';

const channel = vi.hoisted(() => ({ onRoll: null, publish: vi.fn() }));

vi.mock('../../../shared/cloud/useRollChannel.js', () => ({
  useRollChannel: ({ onRoll }) => {
    channel.onRoll = onRoll;
    return { publish: channel.publish };
  },
}));

const entry = (patch = {}) => ({
  id: 'roll-1',
  characterId: 'char-1',
  actorName: 'Arannis',
  label: 'Strength Check',
  detail: 'd20 = 12',
  total: 12,
  rolls: [{ v: 12, faces: 20, kept: true }],
  meta: { bonus: 0, kept: 12 },
  thrown: true,
  timestamp: Date.now(),
  ...patch,
});

function openRolls() {
  return renderHook(() => useVttRolls({
    campaignId: 'campaign-1',
    role: { isGm: false, ownedCharacterIds: ['char-1'] },
    roster: [{ characterId: 'char-1', name: 'Arannis' }],
    tokens: [{ id: 'token-1', characterId: 'char-1' }],
  }));
}

beforeEach(() => {
  channel.onRoll = null;
  channel.publish.mockReset();
});

test('a roll from the embedded sheet shows its battle-map toast immediately', () => {
  const { result } = openRolls();
  const roll = entry();

  act(() => result.current.handleSheetRoll(roll));

  expect(result.current.toast).toMatchObject({ id: roll.id, total: 12 });
  expect(result.current.feed).toHaveLength(1);
  expect(result.current.diceThrows).toHaveLength(1);
  expect(result.current).not.toHaveProperty('showSettledToast');
});

test('a roll received from another device also shows immediately', () => {
  const { result } = openRolls();
  const roll = entry({ id: 'remote-roll' });

  act(() => channel.onRoll(roll));

  expect(result.current.toast).toMatchObject({ id: 'remote-roll', total: 12 });
  expect(result.current.feed).toHaveLength(1);
});

test('the embedded-sheet handoff deduplicates a local channel delivery and suppresses its own bubble', () => {
  const { result } = openRolls();
  const roll = entry();
  act(() => {
    channel.onRoll(roll);
    result.current.handleSheetRoll(roll);
  });
  expect(result.current.feed).toHaveLength(1);
  expect(result.current.feed[0].localOrigin).toBe(true);
  expect(result.current.rollBubbles).toHaveLength(0);
  expect(result.current.diceThrows).toHaveLength(1);
});
