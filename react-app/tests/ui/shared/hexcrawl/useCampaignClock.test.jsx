import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, vi } from 'vitest';
import { CLOCK_FALLBACK_MS, useCampaignClock } from '../../../../src/shared/hexcrawl/useCampaignClock.js';

const api = vi.hoisted(() => ({
  readCampaignClock: vi.fn(), saveCampaignClock: vi.fn(), subscribeHexcrawl: vi.fn(),
  listCampaignLog: vi.fn(), appendCampaignLog: vi.fn(),
}));
vi.mock('../../../../src/shared/cloud/api/hexcrawl.js', () => api);
vi.mock('../../../../src/shared/cloud/auth/AuthProvider.jsx', () => ({
  useAuth: () => ({ cloudEnabled: true, status: 'authed' }),
}));

beforeEach(() => {
  vi.resetAllMocks();
  api.readCampaignClock.mockResolvedValue(null);
  api.listCampaignLog.mockResolvedValue([]);
  api.subscribeHexcrawl.mockReturnValue(() => {});
});

test('an older refresh cannot undo a newer realtime setting; focus recovers missed updates', async () => {
  let finishRead;
  api.readCampaignClock.mockReturnValueOnce(new Promise((resolve) => { finishRead = resolve; }));
  const { result } = renderHook(() => useCampaignClock('campaign-one'));
  const { onClock } = api.subscribeHexcrawl.mock.calls[0][0];
  act(() => onClock({ updatedAt: 20, season: 'Winter', mountSpeed: 2 }));
  await act(async () => finishRead({ updatedAt: 10, season: 'Summer', mountSpeed: 1 }));
  expect(result.current.clock).toMatchObject({ season: 'Winter', mountSpeed: 2 });
  act(() => onClock({ updatedAt: 15, season: 'Autumn' }));
  expect(result.current.clock.season).toBe('Winter');

  api.readCampaignClock.mockResolvedValue({ updatedAt: 30, season: 'Spring', mountSpeed: 3 });
  act(() => window.dispatchEvent(new Event('focus')));
  await waitFor(() => expect(result.current.clock).toMatchObject({ season: 'Spring', mountSpeed: 3 }));
});

test('queued initial selections seed once without overwriting the preceding edit', async () => {
  let stored = null;
  api.saveCampaignClock.mockImplementation(async (_id, patch) => {
    stored = { ...stored, ...patch, updatedAt: (stored?.updatedAt || 0) + 1 };
    return stored;
  });
  const { result } = renderHook(() => useCampaignClock('campaign-one'));
  await waitFor(() => expect(result.current.loading).toBe(false));
  const seed = { travelConfigured: true, terrain: 'Forest', mountSpeed: 1 };
  await act(async () => {
    const first = result.current.saveClock((current) => ({ ...(!current ? seed : {}), terrain: 'Road' }));
    const second = result.current.saveClock((current) => ({ ...(!current ? seed : {}), mountSpeed: 2 }));
    await Promise.all([first, second]);
  });
  expect(api.saveCampaignClock.mock.calls[1][1]).toEqual({ mountSpeed: 2 });
  expect(result.current.clock).toMatchObject({ terrain: 'Road', mountSpeed: 2 });
});

test('a response from the previous campaign cannot replace the new campaign clock', async () => {
  let finishOld;
  api.readCampaignClock
    .mockReturnValueOnce(new Promise((resolve) => { finishOld = resolve; }))
    .mockResolvedValueOnce({ updatedAt: 1, season: 'Summer' });
  const { result, rerender } = renderHook(({ id }) => useCampaignClock(id), { initialProps: { id: 'old' } });
  rerender({ id: 'new' });
  await waitFor(() => expect(result.current.clock?.season).toBe('Summer'));
  await act(async () => finishOld({ updatedAt: 99, season: 'Winter' }));
  expect(result.current.clock.season).toBe('Summer');
});

test('editing before initial loading finishes patches the existing row without seeding over it', async () => {
  api.readCampaignClock
    .mockReturnValueOnce(new Promise(() => {}))
    .mockResolvedValueOnce({ travelConfigured: true, min: 960, season: 'Winter', updatedAt: 1 });
  api.saveCampaignClock.mockResolvedValue({ travelConfigured: true, min: 960, season: 'Spring', updatedAt: 2 });
  const { result } = renderHook(() => useCampaignClock('campaign-one'));
  await act(async () => result.current.saveClock((current) => ({
    ...(!current ? { min: 0, season: 'Summer' } : {}), season: 'Spring',
  })));
  expect(api.saveCampaignClock).toHaveBeenCalledWith('campaign-one', { season: 'Spring' });
  expect(result.current.clock.min).toBe(960);
});

describe('traffic', () => {
  afterEach(() => { vi.useRealTimers(); });

  test('the safety poll is slow, reads only the clock, and does not flash loading', async () => {
    vi.useFakeTimers();
    api.readCampaignClock.mockResolvedValue({ updatedAt: 1, season: 'Summer' });
    const { result } = renderHook(() => useCampaignClock('campaign-one', { withLog: true }));
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(api.readCampaignClock).toHaveBeenCalledTimes(1);
    expect(api.listCampaignLog).toHaveBeenCalledTimes(1);

    const loadingSeen = [];
    await act(async () => { await vi.advanceTimersByTimeAsync(5_000); });
    expect(api.readCampaignClock).toHaveBeenCalledTimes(1);
    await act(async () => { await vi.advanceTimersByTimeAsync(CLOCK_FALLBACK_MS); });
    loadingSeen.push(result.current.loading);
    expect(api.readCampaignClock).toHaveBeenCalledTimes(2);
    expect(api.listCampaignLog).toHaveBeenCalledTimes(1);
    expect(loadingSeen).toEqual([false]);
  });

  test('a clock moved elsewhere re-reads the log; our own echo does not', async () => {
    api.readCampaignClock.mockResolvedValue({ updatedAt: 1, season: 'Summer' });
    const { result } = renderHook(() => useCampaignClock('campaign-one', { withLog: true }));
    await waitFor(() => expect(result.current.clock?.season).toBe('Summer'));
    const { onClock } = api.subscribeHexcrawl.mock.calls[0][0];
    const reads = api.listCampaignLog.mock.calls.length;

    act(() => onClock({ updatedAt: 1, season: 'Summer' }));
    await act(async () => {});
    expect(api.listCampaignLog).toHaveBeenCalledTimes(reads);

    api.listCampaignLog.mockResolvedValue([{ id: 'e1', entry: { text: 'Rain' } }]);
    act(() => onClock({ updatedAt: 2, season: 'Autumn' }));
    await waitFor(() => expect(result.current.log).toHaveLength(1));
    expect(api.listCampaignLog).toHaveBeenCalledTimes(reads + 1);
  });

  test('a reconnect re-reads; the first subscription does not repeat the mount read', async () => {
    api.readCampaignClock.mockResolvedValue({ updatedAt: 1 });
    renderHook(() => useCampaignClock('campaign-one'));
    await waitFor(() => expect(api.readCampaignClock).toHaveBeenCalledTimes(1));
    const { onStatus } = api.subscribeHexcrawl.mock.calls[0][0];
    act(() => onStatus('SUBSCRIBED'));
    await act(async () => {});
    expect(api.readCampaignClock).toHaveBeenCalledTimes(1);
    act(() => onStatus('SUBSCRIBED'));
    await waitFor(() => expect(api.readCampaignClock).toHaveBeenCalledTimes(2));
  });

  test('focus and visibility together read once', async () => {
    api.readCampaignClock.mockResolvedValue({ updatedAt: 1 });
    renderHook(() => useCampaignClock('campaign-one'));
    await waitFor(() => expect(api.readCampaignClock).toHaveBeenCalledTimes(1));
    act(() => {
      window.dispatchEvent(new Event('focus'));
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await waitFor(() => expect(api.readCampaignClock).toHaveBeenCalledTimes(2));
    await act(async () => {});
    expect(api.readCampaignClock).toHaveBeenCalledTimes(2);
  });

  test('no campaign, no poll and no channel', async () => {
    renderHook(() => useCampaignClock(null));
    await act(async () => {});
    expect(api.readCampaignClock).not.toHaveBeenCalled();
    expect(api.subscribeHexcrawl).not.toHaveBeenCalled();
  });
});
