import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { useCharacterCampaign } from '../../../../../src/shared/cloud/sync/useCharacterCampaign.js';
import { useRollChannel } from '../../../../../src/shared/cloud/sync/useRollChannel.js';

const mocks = vi.hoisted(() => ({
  auth: null,
  fetchCloudMeta: vi.fn(),
  channels: [],
}));
vi.mock('../../../../../src/shared/cloud/auth/AuthProvider.jsx', () => ({
  useAuth: () => mocks.auth,
}));
vi.mock('../../../../../src/shared/cloud/api/cloudCharacters.js', () => ({
  fetchCloudMeta: mocks.fetchCloudMeta,
}));
vi.mock('../../../../../src/shared/cloud/supabaseClient.js', () => ({
  supabase: {
    channel: (topic) => {
      const channel = { topic, on: vi.fn(), subscribe: vi.fn(), send: vi.fn().mockResolvedValue('ok') };
      mocks.channels.push(channel);
      return channel;
    },
    removeChannel: vi.fn(),
  },
}));

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('BroadcastChannel', undefined);
  mocks.auth = { cloudEnabled: true, status: 'authed', user: { id: 'player' } };
  mocks.fetchCloudMeta.mockReset().mockResolvedValue({ campaign_id: 'campaign' });
  mocks.channels = [];
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

async function flush() { await act(async () => {}); }

test('a failed campaign lookup recovers and subsequent rolls reach the network', async () => {
  mocks.fetchCloudMeta.mockRejectedValueOnce(new Error('Offline'));
  const { result } = renderHook(() => {
    const campaignId = useCharacterCampaign('character');
    return useRollChannel({ campaignId });
  });
  await flush();
  act(() => result.current.publish({ id: 'lost-roll' }));
  expect(mocks.channels).toHaveLength(0);

  await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
  expect(mocks.channels).toHaveLength(1);
  expect(mocks.channels[0].topic).toBe('gb-rolls-campaign');
  expect(mocks.channels[0].send).not.toHaveBeenCalled();
  act(() => result.current.publish({ id: 'new-roll' }));
  expect(mocks.channels[0].send).toHaveBeenCalledWith({
    type: 'broadcast', event: 'roll', payload: { id: 'new-roll', visibility: 'public' },
  });
});

test.each(['online', 'focus', 'visibilitychange'])('%s retries before the timer expires', async (event) => {
  mocks.fetchCloudMeta.mockRejectedValueOnce(new Error('Offline'));
  const { result } = renderHook(() => useCharacterCampaign('character'));
  await flush();
  await act(async () => {
    if (event === 'visibilitychange') {
      vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
      document.dispatchEvent(new Event(event));
    } else window.dispatchEvent(new Event(event));
  });
  expect(result.current).toBe('campaign');
  await act(async () => { await vi.advanceTimersByTimeAsync(30_000); });
  expect(mocks.fetchCloudMeta).toHaveBeenCalledTimes(2);
});

test('waits for authentication and discards the campaign on logout', async () => {
  mocks.auth.status = 'loading';
  const { result, rerender } = renderHook(() => useCharacterCampaign('character'));
  expect(mocks.fetchCloudMeta).not.toHaveBeenCalled();
  mocks.auth.status = 'authed';
  rerender();
  await flush();
  expect(result.current).toBe('campaign');
  mocks.auth.status = 'anon';
  rerender();
  expect(result.current).toBeNull();
});

test('a late lookup for the previous character cannot change the campaign', async () => {
  let finishOld;
  mocks.fetchCloudMeta.mockReturnValueOnce(new Promise((resolve) => { finishOld = resolve; }));
  const { result, rerender } = renderHook(({ id }) => useCharacterCampaign(id), {
    initialProps: { id: 'old' },
  });
  rerender({ id: 'new' });
  await flush();
  expect(result.current).toBe('campaign');
  await act(async () => { finishOld({ campaign_id: 'old-campaign' }); });
  expect(result.current).toBe('campaign');
});

test('recovery events do not overlap a pending lookup and unmount stops retries', async () => {
  let rejectLookup;
  mocks.fetchCloudMeta.mockReturnValueOnce(new Promise((_, reject) => { rejectLookup = reject; }));
  const { unmount } = renderHook(() => useCharacterCampaign('character'));
  act(() => {
    window.dispatchEvent(new Event('online'));
    window.dispatchEvent(new Event('focus'));
  });
  expect(mocks.fetchCloudMeta).toHaveBeenCalledTimes(1);
  await act(async () => { rejectLookup(new Error('Offline')); });
  unmount();
  await act(async () => {
    window.dispatchEvent(new Event('online'));
    await vi.advanceTimersByTimeAsync(30_000);
  });
  expect(mocks.fetchCloudMeta).toHaveBeenCalledTimes(1);
});

test('a successful lookup without a campaign does not keep retrying', async () => {
  mocks.fetchCloudMeta.mockResolvedValue(null);
  const { result } = renderHook(() => useCharacterCampaign('local-character'));
  await flush();
  await act(async () => {
    window.dispatchEvent(new Event('focus'));
    await vi.advanceTimersByTimeAsync(30_000);
  });
  expect(result.current).toBeNull();
  expect(mocks.fetchCloudMeta).toHaveBeenCalledTimes(1);
});
