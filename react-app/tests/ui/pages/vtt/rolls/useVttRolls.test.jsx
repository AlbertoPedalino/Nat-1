import { act, renderHook } from '@testing-library/react';
import { beforeEach, vi } from 'vitest';
import { useVttRolls } from '../../../../../src/pages/vtt/rolls/useVttRolls.js';

const channel = vi.hoisted(() => ({ onRoll: null, publish: vi.fn() }));

vi.mock('../../../../../src/shared/cloud/sync/useRollChannel.js', () => ({
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

function openRolls(options = {}) {
  return renderHook(() => useVttRolls({
    campaignId: 'campaign-1',
    role: { isGm: false, ownedCharacterIds: ['char-1'] },
    roster: [{ characterId: 'char-1', name: 'Arannis' }],
    tokens: [{ id: 'token-1', characterId: 'char-1' }],
    ...options,
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

test('a roll received from another device gets map feedback but no toast, even for an owned character', () => {
  const { result } = openRolls();
  const roll = entry({ id: 'remote-roll' });

  act(() => channel.onRoll(roll));

  expect(result.current.toast).toBeNull();
  expect(result.current.feed).toHaveLength(1);
  expect(result.current.rollBubbles).toHaveLength(1);
  expect(result.current.diceThrows).toHaveLength(1);
});

test('remote rolls do not replace a local toast, and a local custom roll still gets one', () => {
  const { result } = openRolls();
  act(() => result.current.handleCustomRoll('1d20'));
  const toast = result.current.toast;
  expect(toast).toBeTruthy();
  expect(channel.publish).toHaveBeenCalledOnce();
  act(() => channel.onRoll(entry({ id: 'remote-roll' })));
  expect(result.current.toast).toBe(toast);
  act(() => result.current.dismissToast());
  expect(result.current.toast).toBeNull();
});

test.each([false, true])('monster map feedback follows encounter sharing (public: %s)', (shared) => {
  const token = { id: 'goblin-1', sourceRef: 'enc:fight:1' };
  const { result } = openRolls({
    role: { isGm: true, ownedCharacterIds: [] },
    tokens: [token, { id: 'other-goblin', sourceRef: 'other:fight:1' }],
  });
  act(() => channel.onRoll(entry({
    characterId: null,
    actorName: 'Goblin',
    sourceRef: token.sourceRef,
    visibility: shared ? 'public' : 'gm',
  })));
  expect(result.current.toast).toBeNull();
  expect(result.current.feed).toHaveLength(1);
  expect(result.current.rollBubbles).toHaveLength(shared ? 1 : 0);
  expect(result.current.diceThrows).toHaveLength(shared ? 1 : 0);
  if (shared) {
    expect(result.current.rollBubbles[0].token).toBe(token);
    expect(result.current.diceThrows[0].token).toBe(token);
  }
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
