import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  channel: null,
  handlers: {},
  removeChannel: vi.fn(),
  subscriptionState: null,
}));

vi.mock('../../../../../src/shared/cloud/auth/AuthProvider.jsx', () => ({
  useAuth: () => ({ cloudEnabled: true, status: 'authed', user: { id: 'user-1' } }),
}));

vi.mock('../../../../../src/shared/cloud/supabaseClient.js', () => ({
  supabase: {
    channel: vi.fn(() => mocks.channel),
    removeChannel: mocks.removeChannel,
  },
}));

import { FOLLOWER_HEARTBEAT_MS, FOLLOWER_TTL_MS, useSceneLive } from '../../../../../src/shared/vtt/session/useSceneLive.js';

describe('useSceneLive recovery', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mocks.removeChannel.mockReset();
    mocks.subscriptionState = null;
    mocks.handlers = {};
    mocks.channel = {
      on: vi.fn(function on(type, filter, callback) {
        if (type === 'broadcast') mocks.handlers[filter.event] = callback;
        return this;
      }),
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

  test('tells the caller why it is reconciling, so only a reconnect is thorough', () => {
    const onReconcile = vi.fn();
    const { unmount } = renderHook(() => useSceneLive({ sceneId: 'scene-1', onReconcile }));

    act(() => { mocks.subscriptionState('SUBSCRIBED'); });
    act(() => { window.dispatchEvent(new Event('online')); });
    act(() => { window.dispatchEvent(new Event('focus')); });
    act(() => { vi.advanceTimersByTime(30_000); });
    expect(onReconcile.mock.calls.map(([options]) => options.reason))
      .toEqual(['subscribed', 'online', 'focus', 'interval']);

    unmount();
    act(() => { window.dispatchEvent(new Event('focus')); });
    expect(onReconcile).toHaveBeenCalledTimes(4);
    vi.useRealTimers();
  });

  test('focus and visibility arriving together reconcile once', () => {
    const onReconcile = vi.fn();
    const { unmount } = renderHook(() => useSceneLive({ sceneId: 'scene-1', onReconcile }));
    act(() => {
      window.dispatchEvent(new Event('focus'));
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(onReconcile).toHaveBeenCalledTimes(1);
    act(() => { vi.advanceTimersByTime(3_500); });
    act(() => { window.dispatchEvent(new Event('focus')); });
    expect(onReconcile).toHaveBeenCalledTimes(2);
    unmount();
    vi.useRealTimers();
  });

  test('a channel that fails half-way through setup is removed', () => {
    mocks.channel.subscribe = vi.fn(() => { throw new Error('socket'); });
    renderHook(() => useSceneLive({ sceneId: 'scene-1' }));
    expect(mocks.removeChannel).toHaveBeenCalledWith(mocks.channel);
    vi.useRealTimers();
  });
});

describe('presenter camera', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mocks.removeChannel.mockReset();
    mocks.handlers = {};
    mocks.channel = {
      on: vi.fn(function on(type, filter, callback) {
        if (type === 'broadcast') mocks.handlers[filter.event] = callback;
        return this;
      }),
      send: vi.fn(),
      subscribe: vi.fn(function subscribe(callback) {
        mocks.subscriptionState = callback;
        return this;
      }),
    };
  });
  afterEach(() => { vi.useRealTimers(); });

  const pose = (x) => ({ centerX: x, centerY: 0, zoom: 1 });
  const cameraSends = () => mocks.channel.send.mock.calls.filter(([message]) => message.event === 'camera-view');

  test('with nobody following, panning sends nothing', () => {
    const { result } = renderHook(() => useSceneLive({ sceneId: 'scene-1', cameraSourceId: 'gm-window' }));
    act(() => { result.current.sendCamera(pose(1)); });
    act(() => { vi.advanceTimersByTime(100); });
    act(() => { result.current.sendCamera(pose(2)); });
    expect(cameraSends()).toHaveLength(0);
  });

  test('a projector asking for the camera starts the stream, which lapses without heartbeats', () => {
    const { result } = renderHook(() => useSceneLive({ sceneId: 'scene-1', cameraSourceId: 'gm-window' }));
    act(() => { mocks.handlers['camera-request']({ payload: { source: 'gm-window' } }); });
    const replies = cameraSends().length;
    act(() => { vi.advanceTimersByTime(100); });
    act(() => { result.current.sendCamera(pose(3)); });
    expect(cameraSends()).toHaveLength(replies + 1);

    act(() => { vi.advanceTimersByTime(FOLLOWER_TTL_MS); });
    act(() => { result.current.sendCamera(pose(4)); });
    expect(cameraSends()).toHaveLength(replies + 1);

    act(() => { mocks.handlers['camera-follower']({ payload: { source: 'gm-window' } }); });
    act(() => { result.current.sendCamera(pose(5)); });
    expect(cameraSends()).toHaveLength(replies + 2);
  });

  test('a projector opened from this window streams at once', () => {
    const { result } = renderHook(() => useSceneLive({
      sceneId: 'scene-1', cameraSourceId: 'gm-window', cameraFollowers: true,
    }));
    act(() => { result.current.sendCamera(pose(6)); });
    expect(cameraSends()).toHaveLength(1);
  });

  test('a follower keeps saying so, and answers a presenter that came back', () => {
    renderHook(() => useSceneLive({ sceneId: 'scene-1', followCameraSource: 'gm-window' }));
    const follows = () => mocks.channel.send.mock.calls.filter(([message]) => message.event === 'camera-follower');
    act(() => { vi.advanceTimersByTime(FOLLOWER_HEARTBEAT_MS); });
    expect(follows()).toHaveLength(1);
    act(() => { mocks.handlers['camera-follower-query']({ payload: { source: 'gm-window' } }); });
    expect(follows()).toHaveLength(2);
    act(() => { mocks.handlers['camera-follower-query']({ payload: { source: 'other-window' } }); });
    expect(follows()).toHaveLength(2);
  });

  test('a presenter whose channel comes back asks who is following', () => {
    renderHook(() => useSceneLive({ sceneId: 'scene-1', cameraSourceId: 'gm-window' }));
    act(() => { mocks.subscriptionState('SUBSCRIBED'); });
    expect(mocks.channel.send).toHaveBeenCalledWith(expect.objectContaining({
      event: 'camera-follower-query', payload: { source: 'gm-window' },
    }));
  });
});
