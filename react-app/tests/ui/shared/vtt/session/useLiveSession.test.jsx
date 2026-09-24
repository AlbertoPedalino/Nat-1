import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  auth: { cloudEnabled: true, status: 'authed' },
  channel: null,
  listLiveSceneIds: vi.fn(),
  removeChannel: vi.fn(),
  subscriptionState: null,
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
  listLiveSceneIds: mocks.listLiveSceneIds,
}));

import { useLiveSession } from '../../../../../src/shared/vtt/session/useLiveSession.js';

const scene = (id) => ({ id, campaignId: 'campaign-1', name: id });

describe('useLiveSession', () => {
  beforeEach(() => {
    mocks.auth.cloudEnabled = true;
    mocks.auth.status = 'authed';
    mocks.listLiveSceneIds.mockReset();
    mocks.removeChannel.mockReset();
    mocks.subscriptionState = null;
    mocks.channel = {
      on: vi.fn(function on(type, filter, callback) {
        mocks.onChange = callback;
        return this;
      }),
      subscribe: vi.fn(function subscribe(callback) {
        mocks.subscriptionState = callback;
        return this;
      }),
    };
  });

  test('reconciles after the realtime subscription becomes active', async () => {
    mocks.listLiveSceneIds
      .mockResolvedValueOnce([scene('old-scene')])
      .mockResolvedValueOnce([scene('new-scene')]);

    const { result } = renderHook(() => useLiveSession({ campaignId: 'campaign-1' }));

    await waitFor(() => expect(result.current.scene?.id).toBe('old-scene'));
    act(() => { mocks.subscriptionState('SUBSCRIBED'); });
    await waitFor(() => expect(result.current.scene?.id).toBe('new-scene'));
  });

  test('keeps the current map through a temporary reconciliation failure', async () => {
    mocks.listLiveSceneIds.mockResolvedValueOnce([scene('current-scene')]);

    const { result } = renderHook(() => useLiveSession({ campaignId: 'campaign-1' }));

    await waitFor(() => expect(result.current.scene?.id).toBe('current-scene'));
    mocks.listLiveSceneIds.mockRejectedValueOnce(new Error('offline'));
    act(() => { window.dispatchEvent(new Event('online')); });

    await waitFor(() => expect(mocks.listLiveSceneIds).toHaveBeenCalledTimes(2));
    expect(result.current.scene?.id).toBe('current-scene');
  });

  test('reconciles when the player window regains focus', async () => {
    mocks.listLiveSceneIds
      .mockResolvedValueOnce([scene('old-scene')])
      .mockResolvedValueOnce([scene('new-scene')]);

    const { result } = renderHook(() => useLiveSession({ campaignId: 'campaign-1' }));

    await waitFor(() => expect(result.current.scene?.id).toBe('old-scene'));
    act(() => { window.dispatchEvent(new Event('focus')); });
    await waitFor(() => expect(result.current.scene?.id).toBe('new-scene'));
  });

  test('asks only which scene of this campaign is live', async () => {
    mocks.listLiveSceneIds.mockResolvedValue([scene('live')]);
    const { result } = renderHook(() => useLiveSession({ campaignId: 'campaign-1' }));
    await waitFor(() => expect(result.current.scene?.id).toBe('live'));
    expect(mocks.listLiveSceneIds).toHaveBeenCalledWith('campaign-1');
  });

  test('the live scene editing itself does not trigger another read', async () => {
    mocks.listLiveSceneIds.mockResolvedValue([scene('live')]);
    const { result } = renderHook(() => useLiveSession({ campaignId: 'campaign-1' }));
    await waitFor(() => expect(result.current.scene?.id).toBe('live'));
    const reads = mocks.listLiveSceneIds.mock.calls.length;
    act(() => { mocks.onChange({ eventType: 'UPDATE', new: { id: 'live', is_live: true, fog: {} } }); });
    await act(async () => {});
    expect(mocks.listLiveSceneIds).toHaveBeenCalledTimes(reads);
  });

  test('another scene going live, or this one leaving, is followed', async () => {
    mocks.listLiveSceneIds.mockResolvedValueOnce([scene('live')]);
    const { result } = renderHook(() => useLiveSession({ campaignId: 'campaign-1' }));
    await waitFor(() => expect(result.current.scene?.id).toBe('live'));

    mocks.listLiveSceneIds.mockResolvedValueOnce([scene('next')]);
    act(() => { mocks.onChange({ eventType: 'UPDATE', new: { id: 'next', is_live: true } }); });
    await waitFor(() => expect(result.current.scene?.id).toBe('next'));

    mocks.listLiveSceneIds.mockResolvedValueOnce([]);
    act(() => { mocks.onChange({ eventType: 'UPDATE', new: { id: 'next', is_live: false } }); });
    await waitFor(() => expect(result.current.scene).toBeNull());

    mocks.listLiveSceneIds.mockResolvedValueOnce([scene('other')]);
    act(() => { mocks.onChange({ eventType: 'DELETE', new: {}, old: { id: 'x' } }); });
    await waitFor(() => expect(result.current.scene?.id).toBe('other'));
  });

  test('focus and visibility arriving together read once', async () => {
    mocks.listLiveSceneIds.mockResolvedValue([scene('live')]);
    const { result } = renderHook(() => useLiveSession({ campaignId: 'campaign-1' }));
    await waitFor(() => expect(result.current.scene?.id).toBe('live'));
    const reads = mocks.listLiveSceneIds.mock.calls.length;
    act(() => {
      window.dispatchEvent(new Event('focus'));
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await act(async () => {});
    expect(mocks.listLiveSceneIds).toHaveBeenCalledTimes(reads + 1);
  });

  test('a channel that fails half-way through setup is still removed', async () => {
    mocks.listLiveSceneIds.mockResolvedValue([]);
    mocks.channel.subscribe = vi.fn(() => { throw new Error('socket'); });
    renderHook(() => useLiveSession({ campaignId: 'campaign-1' }));
    await act(async () => {});
    expect(mocks.removeChannel).toHaveBeenCalledWith(mocks.channel);
  });
});
