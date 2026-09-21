import { act, renderHook, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { useSceneContent } from '../../../../../src/pages/vtt/scene/useSceneContent.js';

const cloud = vi.hoisted(() => ({
  listTokens: vi.fn(), listDrawings: vi.fn(), listTokenSecrets: vi.fn(),
  listCampaignCharacters: vi.fn(), readCampaignVitals: vi.fn(), signMapImage: vi.fn(),
}));
vi.mock('../../../../../src/shared/cloud/api/vtt.js', () => cloud);
vi.mock('../../../../../src/shared/cloud/api/campaigns.js', () => cloud);
vi.mock('../../../../../src/shared/campaign/characterVitals.js', () => ({
  readCampaignVitals: cloud.readCampaignVitals, mergeVitals: (roster) => roster,
}));

function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}
beforeEach(() => {
  cloud.listTokens.mockReset().mockResolvedValue([]);
  cloud.listDrawings.mockReset().mockResolvedValue([]);
  cloud.listTokenSecrets.mockResolvedValue({});
  cloud.listCampaignCharacters.mockResolvedValue([]);
  cloud.readCampaignVitals.mockReset().mockResolvedValue({});
});
function openScene() {
  const notify = vi.fn();
  return {
    notify,
    ...renderHook(() => useSceneContent({
      scene: { id: 'scene', campaignId: 'campaign' }, isGm: true, spectator: false, notify,
    })),
  };
}

test('a reconnect finishing before the initial load releases the spinner and wins', async () => {
  const initial = deferred();
  cloud.listTokens.mockReturnValueOnce(initial.promise)
    .mockResolvedValueOnce([{ id: 'fresh' }]);
  const { result } = openScene();
  expect(result.current.loading).toBe(true);
  await act(async () => { await result.current.refreshContent(); });
  expect(result.current.loading).toBe(false);
  expect(result.current.tokens).toEqual([{ id: 'fresh' }]);
  await act(async () => initial.resolve([{ id: 'stale' }]));
  expect(result.current.tokens).toEqual([{ id: 'fresh' }]);
});

test('a failed reconnect also releases an initial spinner', async () => {
  cloud.listTokens.mockReturnValueOnce(new Promise(() => {}))
    .mockRejectedValueOnce(new Error('Offline'));
  const { result, notify } = openScene();
  await act(async () => { await result.current.refreshContent(); });
  expect(result.current.loading).toBe(false);
  expect(notify).toHaveBeenCalledWith('error', 'Offline');
});

test('optional character vitals do not block a ready map', async () => {
  cloud.readCampaignVitals.mockReturnValue(new Promise(() => {}));
  const { result } = openScene();
  await waitFor(() => expect(result.current.loading).toBe(false));
});

test.each(['refreshContent', 'refreshVisibleTokens'])('%s preserves changes made during the read and refreshes untouched tokens', async (method) => {
  cloud.listTokens.mockResolvedValueOnce([
    { id: 'moved', x: 0 }, { id: 'deleted', x: 0 }, { id: 'untouched', x: 0 },
  ]);
  const { result } = openScene();
  await waitFor(() => expect(result.current.loading).toBe(false));
  const snapshot = deferred();
  cloud.listTokens.mockReturnValueOnce(snapshot.promise);
  let refreshing;
  act(() => { refreshing = result.current[method](); });
  act(() => {
    result.current.setTokens((current) => [
      ...current.filter((item) => item.id !== 'deleted')
        .map((item) => item.id === 'moved' ? { ...item, x: 10 } : item),
      { id: 'inserted', x: 5 },
    ]);
  });
  await act(async () => {
    snapshot.resolve([{ id: 'moved', x: 0 }, { id: 'deleted', x: 0 }, { id: 'untouched', x: 7 }]);
    await refreshing;
  });
  expect(result.current.tokens).toHaveLength(3);
  expect(result.current.tokens).toEqual(expect.arrayContaining([
    { id: 'moved', x: 10 }, { id: 'inserted', x: 5 }, { id: 'untouched', x: 7 },
  ]));
});

test('a snapshot started during a group move cannot undo it even after saving finishes', async () => {
  cloud.listTokens.mockResolvedValueOnce([{ id: 'a', x: 0 }, { id: 'b', x: 0 }]);
  const { result } = openScene();
  await waitFor(() => expect(result.current.loading).toBe(false));
  const finishMove = result.current.beginTokenMove(['a', 'b']);
  act(() => result.current.setTokens((current) => current.map((item) => ({ ...item, x: 10 }))));
  const snapshot = deferred();
  cloud.listTokens.mockReturnValueOnce(snapshot.promise);
  let refreshing;
  act(() => { refreshing = result.current.refreshContent(); });
  finishMove();
  await act(async () => {
    snapshot.resolve([{ id: 'a', x: 0 }, { id: 'b', x: 0 }]);
    await refreshing;
  });
  expect(result.current.tokens.map((item) => item.x)).toEqual([10, 10]);
  cloud.listTokens.mockResolvedValueOnce([{ id: 'a', x: 20 }, { id: 'b', x: 20 }]);
  await act(async () => { await result.current.refreshContent(); });
  expect(result.current.tokens.map((item) => item.x)).toEqual([20, 20]);
});

test.each([
  ['refreshContent', 'refreshVisibleTokens'],
  ['refreshVisibleTokens', 'refreshContent'],
])('a slow %s cannot replace a newer %s', async (older, newer) => {
  const { result } = openScene();
  await waitFor(() => expect(result.current.loading).toBe(false));
  const snapshot = deferred();
  cloud.listTokens.mockReturnValueOnce(snapshot.promise).mockResolvedValueOnce([{ id: 'fresh', x: 10 }]);
  let refreshing;
  act(() => { refreshing = result.current[older](); });
  await act(async () => { await result.current[newer](); });
  await act(async () => {
    snapshot.resolve([{ id: 'old', x: 0 }]);
    await refreshing;
  });
  expect(result.current.tokens).toEqual([{ id: 'fresh', x: 10 }]);
});

test('a pending visibility read cannot inject tokens into another scene', async () => {
  const notify = vi.fn();
  const { result, rerender } = renderHook(({ id }) => useSceneContent({
    scene: { id, campaignId: 'campaign' }, isGm: true, spectator: false, notify,
  }), { initialProps: { id: 'old-scene' } });
  await waitFor(() => expect(result.current.loading).toBe(false));
  const snapshot = deferred();
  cloud.listTokens.mockReturnValueOnce(snapshot.promise).mockResolvedValueOnce([{ id: 'new-scene-token' }]);
  let refreshing;
  act(() => { refreshing = result.current.refreshVisibleTokens(); });
  rerender({ id: 'new-scene' });
  await waitFor(() => expect(result.current.tokens).toEqual([{ id: 'new-scene-token' }]));
  await act(async () => {
    snapshot.resolve([{ id: 'old-scene-token' }]);
    await refreshing;
  });
  expect(result.current.tokens).toEqual([{ id: 'new-scene-token' }]);
});

test('drawing changes made during a snapshot are preserved too', async () => {
  cloud.listDrawings.mockResolvedValueOnce([{ id: 'drawing', points: [0, 0] }]);
  const { result } = openScene();
  await waitFor(() => expect(result.current.loading).toBe(false));
  const snapshot = deferred();
  cloud.listDrawings.mockReturnValueOnce(snapshot.promise);
  let refreshing;
  act(() => { refreshing = result.current.refreshContent(); });
  act(() => result.current.setDrawings([{ id: 'drawing', points: [10, 10] }]));
  await act(async () => {
    snapshot.resolve([{ id: 'drawing', points: [0, 0] }]);
    await refreshing;
  });
  expect(result.current.drawings).toEqual([{ id: 'drawing', points: [10, 10] }]);
});
