import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  auth: { cloudEnabled: true, status: 'authed' },
  channel: null,
  readLiveSceneId: vi.fn(),
  removeChannel: vi.fn(),
  subscriptionState: null,
  subscriptions: [],
  onChange: null,
}));

vi.mock('../../../../../src/shared/cloud/auth/AuthProvider.jsx', () => ({
  useAuth: () => mocks.auth,
}));

vi.mock('../../../../../src/shared/cloud/supabaseClient.js', () => ({
  supabase: {
    channel: vi.fn(() => mocks.channel),
    removeChannel: mocks.removeChannel,
  },
}));

vi.mock('../../../../../src/shared/cloud/api/vtt.js', () => ({
  readLiveSceneId: mocks.readLiveSceneId,
}));

import { useLiveSession } from '../../../../../src/shared/vtt/session/useLiveSession.js';

describe('useLiveSession', () => {
  beforeEach(() => {
    mocks.auth.cloudEnabled = true;
    mocks.auth.status = 'authed';
    mocks.readLiveSceneId.mockReset();
    mocks.removeChannel.mockReset();
    mocks.subscriptionState = null;
    mocks.subscriptions = [];
    mocks.channel = {
      on: vi.fn(function on(type, filter, callback) {
        mocks.subscriptions.push(filter);
        mocks.onChange = callback;
        return this;
      }),
      subscribe: vi.fn(function subscribe(callback) {
        mocks.subscriptionState = callback;
        return this;
      }),
    };
  });

  test('follows only the live-scene projection, never the scene rows', async () => {
    mocks.readLiveSceneId.mockResolvedValue('scene-a');
    const { result } = renderHook(() => useLiveSession({ campaignId: 'campaign-1' }));
    await waitFor(() => expect(result.current.scene).toEqual({ id: 'scene-a', campaignId: 'campaign-1' }));
    expect(mocks.subscriptions).toEqual([
      { event: '*', schema: 'public', table: 'campaign_live_scenes', filter: 'campaign_id=eq.campaign-1' },
    ]);
    expect(mocks.readLiveSceneId).toHaveBeenCalledWith('campaign-1');
  });

  test('a live switch and the end of the session arrive as events, with no read', async () => {
    mocks.readLiveSceneId.mockResolvedValue('scene-a');
    const { result } = renderHook(() => useLiveSession({ campaignId: 'campaign-1' }));
    await waitFor(() => expect(result.current.scene?.id).toBe('scene-a'));
    const reads = mocks.readLiveSceneId.mock.calls.length;

    act(() => { mocks.onChange({ eventType: 'UPDATE', new: { campaign_id: 'campaign-1', scene_id: 'scene-b' } }); });
    expect(result.current.scene?.id).toBe('scene-b');
    act(() => { mocks.onChange({ eventType: 'UPDATE', new: { campaign_id: 'campaign-1', scene_id: null } }); });
    expect(result.current.scene).toBeNull();
    expect(mocks.readLiveSceneId).toHaveBeenCalledTimes(reads);
  });

  test('an event wins over a read that was already in flight', async () => {
    mocks.readLiveSceneId.mockResolvedValueOnce('scene-a');
    const { result } = renderHook(() => useLiveSession({ campaignId: 'campaign-1' }));
    await waitFor(() => expect(result.current.scene?.id).toBe('scene-a'));
    let finish;
    mocks.readLiveSceneId.mockReturnValueOnce(new Promise((resolve) => { finish = resolve; }));
    act(() => { window.dispatchEvent(new Event('online')); });
    act(() => { mocks.onChange({ eventType: 'UPDATE', new: { campaign_id: 'campaign-1', scene_id: 'scene-b' } }); });
    await act(async () => finish('scene-a'));
    expect(result.current.scene?.id).toBe('scene-b');
  });

  test('reconciles after the realtime subscription becomes active (reconnect)', async () => {
    mocks.readLiveSceneId.mockResolvedValueOnce('old-scene').mockResolvedValueOnce('new-scene');
    const { result } = renderHook(() => useLiveSession({ campaignId: 'campaign-1' }));
    await waitFor(() => expect(result.current.scene?.id).toBe('old-scene'));
    act(() => { mocks.subscriptionState('SUBSCRIBED'); });
    await waitFor(() => expect(result.current.scene?.id).toBe('new-scene'));
  });

  test('keeps the current map through a temporary reconciliation failure', async () => {
    mocks.readLiveSceneId.mockResolvedValueOnce('current-scene');
    const { result } = renderHook(() => useLiveSession({ campaignId: 'campaign-1' }));
    await waitFor(() => expect(result.current.scene?.id).toBe('current-scene'));
    mocks.readLiveSceneId.mockRejectedValueOnce(new Error('offline'));
    act(() => { window.dispatchEvent(new Event('online')); });
    await waitFor(() => expect(mocks.readLiveSceneId).toHaveBeenCalledTimes(2));
    expect(result.current.scene?.id).toBe('current-scene');
  });

  test('focus and visibility arriving together read once', async () => {
    mocks.readLiveSceneId.mockResolvedValue('live');
    const { result } = renderHook(() => useLiveSession({ campaignId: 'campaign-1' }));
    await waitFor(() => expect(result.current.scene?.id).toBe('live'));
    const reads = mocks.readLiveSceneId.mock.calls.length;
    act(() => {
      window.dispatchEvent(new Event('focus'));
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await act(async () => {});
    expect(mocks.readLiveSceneId).toHaveBeenCalledTimes(reads + 1);
  });

  test('a direct ?scene= view opens no session channel at all', async () => {
    renderHook(() => useLiveSession({ campaignId: null }));
    await act(async () => {});
    expect(mocks.readLiveSceneId).not.toHaveBeenCalled();
    expect(mocks.channel.on).not.toHaveBeenCalled();
  });

  test('a channel that fails half-way through setup is still removed', async () => {
    mocks.readLiveSceneId.mockResolvedValue(null);
    mocks.channel.subscribe = vi.fn(() => { throw new Error('socket'); });
    renderHook(() => useLiveSession({ campaignId: 'campaign-1' }));
    await act(async () => {});
    expect(mocks.removeChannel).toHaveBeenCalledWith(mocks.channel);
  });
});
