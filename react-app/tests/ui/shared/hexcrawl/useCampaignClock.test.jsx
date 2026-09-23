import { act, renderHook, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { useCampaignClock } from '../../../../src/shared/hexcrawl/useCampaignClock.js';

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
