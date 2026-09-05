import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  channel: null,
  removeChannel: vi.fn(),
  subscriptionState: null,
}));

vi.mock('../cloud/AuthProvider.jsx', () => ({
  useAuth: () => ({ cloudEnabled: true, status: 'authed', user: { id: 'user-1' } }),
}));

vi.mock('../cloud/supabaseClient.js', () => ({
  supabase: {
    channel: vi.fn(() => mocks.channel),
    removeChannel: mocks.removeChannel,
  },
}));

import { useSceneLive } from './useSceneLive.js';

describe('useSceneLive recovery', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mocks.removeChannel.mockReset();
    mocks.subscriptionState = null;
    mocks.channel = {
      on: vi.fn(function on() { return this; }),
      send: vi.fn(),
      subscribe: vi.fn(function subscribe(callback) {
        mocks.subscriptionState = callback;
        return this;
      }),
    };
  });

  test('reconciles on subscription, online recovery and the 30-second safety interval', () => {
    const onReconcile = vi.fn();
    const { unmount } = renderHook(() => useSceneLive({
      sceneId: 'scene-1',
      campaignId: 'campaign-1',
      onReconcile,
    }));

    act(() => { mocks.subscriptionState('SUBSCRIBED'); });
    expect(onReconcile).toHaveBeenCalledTimes(1);

    act(() => { window.dispatchEvent(new Event('online')); });
    expect(onReconcile).toHaveBeenCalledTimes(2);

    act(() => { vi.advanceTimersByTime(30_000); });
    expect(onReconcile).toHaveBeenCalledTimes(3);

    unmount();
    act(() => { vi.advanceTimersByTime(30_000); });
    expect(onReconcile).toHaveBeenCalledTimes(3);
    vi.useRealTimers();
  });
});
