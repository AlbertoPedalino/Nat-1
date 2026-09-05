import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  channel: null,
  getCloudCharacter: vi.fn(),
  onUpdate: vi.fn(),
  removeChannel: vi.fn(),
  subscriptionState: null,
}));

vi.mock('./AuthProvider.jsx', () => ({
  useAuth: () => ({ cloudEnabled: true, status: 'authed', user: { id: 'user-1' } }),
}));

vi.mock('./supabaseClient.js', () => ({
  supabase: {
    channel: vi.fn(() => mocks.channel),
    removeChannel: mocks.removeChannel,
  },
}));

vi.mock('./cloudCharacters.js', () => ({
  getCloudCharacter: mocks.getCloudCharacter,
}));

import { useCloudCharacterLive } from './useCloudCharacterLive.js';

const row = (currentHP, updatedAt) => ({
  id: 'char-1',
  data: { currentHP },
  updated_at: updatedAt,
});

describe('useCloudCharacterLive recovery', () => {
  beforeEach(() => {
    mocks.getCloudCharacter.mockReset();
    mocks.onUpdate.mockReset();
    mocks.removeChannel.mockReset();
    mocks.subscriptionState = null;
    mocks.channel = {
      on: vi.fn(function on() { return this; }),
      subscribe: vi.fn(function subscribe(callback) {
        mocks.subscriptionState = callback;
        return this;
      }),
    };
  });

  test('re-reads the character when realtime subscribes and the window returns online', async () => {
    mocks.getCloudCharacter
      .mockResolvedValueOnce(row(8, '2026-09-05T10:00:00.000Z'))
      .mockResolvedValueOnce(row(6, '2026-09-05T10:01:00.000Z'));

    renderHook(() => useCloudCharacterLive({ charId: 'char-1', onUpdate: mocks.onUpdate }));

    act(() => { mocks.subscriptionState('SUBSCRIBED'); });
    await waitFor(() => expect(mocks.onUpdate).toHaveBeenLastCalledWith(row(8, '2026-09-05T10:00:00.000Z')));

    act(() => { window.dispatchEvent(new Event('online')); });
    await waitFor(() => expect(mocks.onUpdate).toHaveBeenLastCalledWith(row(6, '2026-09-05T10:01:00.000Z')));
  });

  test('does not let an older recovery read replace a newer realtime row', async () => {
    let finishRead;
    mocks.getCloudCharacter.mockImplementation(() => new Promise((resolve) => { finishRead = resolve; }));

    renderHook(() => useCloudCharacterLive({ charId: 'char-1', onUpdate: mocks.onUpdate }));
    act(() => { mocks.subscriptionState('SUBSCRIBED'); });

    const realtimeHandler = mocks.channel.on.mock.calls.find(([kind]) => kind === 'postgres_changes')[2];
    act(() => {
      realtimeHandler({ new: row(4, '2026-09-05T10:02:00.000Z') });
      finishRead(row(9, '2026-09-05T10:01:00.000Z'));
    });

    await waitFor(() => expect(mocks.onUpdate).toHaveBeenCalledTimes(1));
    expect(mocks.onUpdate).toHaveBeenLastCalledWith(row(4, '2026-09-05T10:02:00.000Z'));
  });
});
