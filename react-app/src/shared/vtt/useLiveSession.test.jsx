import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  auth: { cloudEnabled: true, status: 'authed' },
  channel: null,
  listLiveScenes: vi.fn(),
  removeChannel: vi.fn(),
  subscriptionState: null,
}));

vi.mock('../cloud/AuthProvider.jsx', () => ({
  useAuth: () => mocks.auth,
}));

vi.mock('../cloud/supabaseClient.js', () => ({
  supabase: {
    channel: vi.fn(() => mocks.channel),
    removeChannel: mocks.removeChannel,
  },
}));

vi.mock('../cloud/vtt.js', () => ({
  listLiveScenes: mocks.listLiveScenes,
}));

import { useLiveSession } from './useLiveSession.js';

const scene = (id) => ({ id, campaignId: 'campaign-1', name: id });

describe('useLiveSession', () => {
  beforeEach(() => {
    mocks.auth.cloudEnabled = true;
    mocks.auth.status = 'authed';
    mocks.listLiveScenes.mockReset();
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

  test('reconciles after the realtime subscription becomes active', async () => {
    mocks.listLiveScenes
      .mockResolvedValueOnce([scene('old-scene')])
      .mockResolvedValueOnce([scene('new-scene')]);

    const { result } = renderHook(() => useLiveSession({ campaignId: 'campaign-1' }));

    await waitFor(() => expect(result.current.scene?.id).toBe('old-scene'));
    act(() => { mocks.subscriptionState('SUBSCRIBED'); });
    await waitFor(() => expect(result.current.scene?.id).toBe('new-scene'));
  });

  test('keeps the current map through a temporary reconciliation failure', async () => {
    mocks.listLiveScenes.mockResolvedValueOnce([scene('current-scene')]);

    const { result } = renderHook(() => useLiveSession({ campaignId: 'campaign-1' }));

    await waitFor(() => expect(result.current.scene?.id).toBe('current-scene'));
    mocks.listLiveScenes.mockRejectedValueOnce(new Error('offline'));
    act(() => { window.dispatchEvent(new Event('online')); });

    await waitFor(() => expect(mocks.listLiveScenes).toHaveBeenCalledTimes(2));
    expect(result.current.scene?.id).toBe('current-scene');
  });

  test('reconciles when the player window regains focus', async () => {
    mocks.listLiveScenes
      .mockResolvedValueOnce([scene('old-scene')])
      .mockResolvedValueOnce([scene('new-scene')]);

    const { result } = renderHook(() => useLiveSession({ campaignId: 'campaign-1' }));

    await waitFor(() => expect(result.current.scene?.id).toBe('old-scene'));
    act(() => { window.dispatchEvent(new Event('focus')); });
    await waitFor(() => expect(result.current.scene?.id).toBe('new-scene'));
  });
});
