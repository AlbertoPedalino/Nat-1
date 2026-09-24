import { act, renderHook, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { useSceneContent } from '../../../../../src/pages/vtt/scene/useSceneContent.js';

const cloud = vi.hoisted(() => ({
  listTokens: vi.fn(), listDrawings: vi.fn(), listTokenSecrets: vi.fn(),
  listCampaignCharacters: vi.fn(), readCampaignVitals: vi.fn(), signMapImage: vi.fn(),
  listTokenRevisions: vi.fn(), listTokensByIds: vi.fn(), listDrawingIds: vi.fn(), listDrawingsByIds: vi.fn(),
  listCampaignCharacterRevisions: vi.fn(), listCampaignCharactersByIds: vi.fn(),
}));
vi.mock('../../../../../src/shared/cloud/api/vtt.js', () => cloud);
vi.mock('../../../../../src/shared/cloud/api/campaigns.js', () => cloud);
vi.mock('../../../../../src/shared/campaign/characterVitals.js', async (original) => ({
  ...await original(), readCampaignVitals: cloud.readCampaignVitals,
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
  for (const name of [
    'listTokenRevisions', 'listTokensByIds', 'listDrawingIds', 'listDrawingsByIds',
    'listCampaignCharacterRevisions', 'listCampaignCharactersByIds',
  ]) cloud[name].mockReset().mockResolvedValue([]);
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

test('late character calculations and older RPC responses cannot undo newer HP on the map', async () => {
  const row = (hp, revision) => ({ id: 'pc', row_revision: revision, data: { currentHP: hp } });
  const vitals = (hp) => new Map([['pc', { hpCurrent: hp, hpMax: 30, tempHp: 0 }]]);
  cloud.listCampaignCharacters.mockResolvedValue([row(30, 0)]);
  cloud.readCampaignVitals.mockResolvedValue(vitals(30));
  const { result } = openScene();
  await waitFor(() => expect(result.current.roster[0]?.hpCurrent).toBe(30));
  const slow = deferred();
  cloud.readCampaignVitals.mockReturnValueOnce(slow.promise).mockResolvedValueOnce(vitals(10));
  act(() => result.current.handleCharacterEvent({ new: row(20, 1) }));
  await act(async () => result.current.handleCharacterEvent({ new: row(10, 2) }));
  expect(result.current.roster[0].hpCurrent).toBe(10);
  await act(async () => slow.resolve(vitals(20)));
  act(() => window.dispatchEvent(new CustomEvent('gb:character-row', { detail: row(20, 1) })));
  expect(result.current.roster[0].hpCurrent).toBe(10);
});

test('a reconnect snapshot uses character updates received while its request was pending', async () => {
  const row = (hp, revision) => ({ id: 'pc', row_revision: revision, data: { currentHP: hp } });
  cloud.listCampaignCharacters.mockResolvedValue([row(30, 0)]);
  cloud.readCampaignVitals.mockImplementation(async (rows) => new Map(rows.map((r) => [r.id, { hpCurrent: r.data.currentHP, hpMax: 30 }])));
  const { result } = openScene();
  await waitFor(() => expect(result.current.roster[0]?.hpCurrent).toBe(30));
  const staleRead = deferred();
  cloud.listCampaignCharacters.mockReturnValueOnce(staleRead.promise);
  let refresh;
  act(() => { refresh = result.current.refreshContent(); });
  await act(async () => result.current.handleCharacterEvent({ new: row(10, 2) }));
  await act(async () => { staleRead.resolve([row(20, 1)]); await refresh; });
  expect(result.current.roster[0].hpCurrent).toBe(10);
});

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

describe('light reconciliation', () => {
  const token = (id, updatedAt, x = 0) => ({ id, updatedAt, x });
  const sheet = (id, revision, hp = 30) => ({ id, row_revision: revision, data: { name: id, currentHP: hp } });

  async function settledScene({ tokens = [], characters = [], drawings = [] } = {}) {
    cloud.listTokens.mockResolvedValueOnce(tokens);
    cloud.listCampaignCharacters.mockResolvedValueOnce(characters);
    cloud.listDrawings.mockResolvedValueOnce(drawings);
    cloud.readCampaignVitals.mockImplementation(async (rows) => new Map(rows.map((row) => [
      row.id, { hpCurrent: row.data.currentHP, hpMax: 30, tempHp: 0 },
    ])));
    const view = openScene();
    await waitFor(() => expect(view.result.current.loading).toBe(false));
    await waitFor(() => expect(view.result.current.roster).toHaveLength(characters.length));
    for (const fn of Object.values(cloud)) fn.mockClear();
    cloud.listTokenRevisions.mockResolvedValue(tokens.map(({ id, updatedAt }) => ({ id, updatedAt })));
    cloud.listCampaignCharacterRevisions.mockResolvedValue(
      characters.map(({ id, row_revision: revision }) => ({ id, row_revision: revision })),
    );
    cloud.listDrawingIds.mockResolvedValue(drawings.map(({ id }) => id));
    return view;
  }

  test('a quiet table reads versions only', async () => {
    const { result } = await settledScene({
      tokens: [token('a', 1)], characters: [sheet('pc', 3)], drawings: [{ id: 'd', points: [] }],
    });
    const before = { tokens: result.current.tokens, drawings: result.current.drawings, roster: result.current.roster };
    await act(async () => { await result.current.reconcileContent(); });
    for (const heavy of [
      'listTokens', 'listTokensByIds', 'listCampaignCharacters', 'listCampaignCharactersByIds',
      'listDrawings', 'listDrawingsByIds', 'readCampaignVitals',
    ]) expect(cloud[heavy]).not.toHaveBeenCalled();
    expect(result.current.tokens).toBe(before.tokens);
    expect(result.current.drawings).toBe(before.drawings);
    expect(result.current.roster).toBe(before.roster);
  });

  test('only the pieces whose version moved are fetched; vanished ones leave', async () => {
    const { result } = await settledScene({ tokens: [token('a', 1), token('b', 1), token('gone', 1)] });
    cloud.listTokenRevisions.mockResolvedValue([
      { id: 'a', updatedAt: 1 }, { id: 'b', updatedAt: 2 }, { id: 'new', updatedAt: 1 },
    ]);
    cloud.listTokensByIds.mockResolvedValue([token('b', 2, 9), token('new', 1, 4)]);
    await act(async () => { await result.current.reconcileContent(); });
    expect(cloud.listTokensByIds).toHaveBeenCalledWith('scene', ['b', 'new']);
    expect(cloud.listTokens).not.toHaveBeenCalled();
    expect(result.current.tokens).toEqual([token('a', 1), token('b', 2, 9), token('new', 1, 4)]);
  });

  test('a secret label changed elsewhere is applied even when no piece moved', async () => {
    const { result } = await settledScene({ tokens: [token('a', 1)] });
    cloud.listTokenSecrets.mockResolvedValueOnce({ a: 'Ambusher' });
    await act(async () => { await result.current.reconcileContent(); });
    expect(result.current.tokens[0].secretLabel).toBe('Ambusher');
    expect(cloud.listTokensByIds).not.toHaveBeenCalled();
  });

  test('only a sheet with a later revision is re-read', async () => {
    const { result } = await settledScene({ characters: [sheet('pc', 3), sheet('other', 5)] });
    cloud.listCampaignCharacterRevisions.mockResolvedValue([
      { id: 'pc', row_revision: 4 }, { id: 'other', row_revision: 5 },
    ]);
    cloud.listCampaignCharactersByIds.mockResolvedValue([sheet('pc', 4, 12)]);
    await act(async () => { await result.current.reconcileContent(); });
    expect(cloud.listCampaignCharactersByIds).toHaveBeenCalledWith('campaign', ['pc']);
    expect(cloud.listCampaignCharacters).not.toHaveBeenCalled();
    expect(result.current.roster.find((entry) => entry.characterId === 'pc').hpCurrent).toBe(12);
    expect(result.current.roster.find((entry) => entry.characterId === 'other').hpCurrent).toBe(30);
  });

  test('a sheet leaving the campaign leaves the roster without any sheet download', async () => {
    const { result } = await settledScene({ characters: [sheet('pc', 3), sheet('left', 1)] });
    cloud.listCampaignCharacterRevisions.mockResolvedValue([{ id: 'pc', row_revision: 3 }]);
    await act(async () => { await result.current.reconcileContent(); });
    expect(cloud.listCampaignCharactersByIds).not.toHaveBeenCalled();
    expect(result.current.roster.map((entry) => entry.characterId)).toEqual(['pc']);
  });

  test('new and erased strokes are found by id; a reconnect re-reads them all', async () => {
    const { result } = await settledScene({ drawings: [{ id: 'kept', points: [] }, { id: 'erased', points: [] }] });
    cloud.listDrawingIds.mockResolvedValue(['kept', 'added']);
    cloud.listDrawingsByIds.mockResolvedValue([{ id: 'added', points: [1] }]);
    await act(async () => { await result.current.reconcileContent(); });
    expect(cloud.listDrawingsByIds).toHaveBeenCalledWith('scene', ['added']);
    expect(result.current.drawings.map((item) => item.id)).toEqual(['kept', 'added']);

    cloud.listDrawings.mockResolvedValueOnce([{ id: 'kept', points: [5] }, { id: 'added', points: [1] }]);
    await act(async () => { await result.current.reconcileContent({ fullDrawings: true }); });
    expect(cloud.listDrawingIds).toHaveBeenCalledTimes(1);
    expect(result.current.drawings[0].points).toEqual([5]);
  });

  test('before the first full read lands, recovery is the full read', async () => {
    cloud.listTokens.mockReturnValueOnce(new Promise(() => {})).mockResolvedValueOnce([{ id: 'fresh' }]);
    const { result } = openScene();
    await act(async () => { await result.current.reconcileContent(); });
    expect(cloud.listTokenRevisions).not.toHaveBeenCalled();
    expect(result.current.tokens).toEqual([{ id: 'fresh' }]);
    expect(result.current.loading).toBe(false);
  });

  test('a piece moved locally during the check is not overwritten', async () => {
    const { result } = await settledScene({ tokens: [token('a', 1)] });
    const versions = deferred();
    cloud.listTokenRevisions.mockReturnValueOnce(versions.promise);
    cloud.listTokensByIds.mockResolvedValue([token('a', 2, 3)]);
    let reconciling;
    act(() => { reconciling = result.current.reconcileContent(); });
    act(() => result.current.setTokens((current) => current.map((item) => ({ ...item, x: 50 }))));
    await act(async () => {
      versions.resolve([{ id: 'a', updatedAt: 2 }]);
      await reconciling;
    });
    expect(result.current.tokens[0].x).toBe(50);
  });

  test('a failed check stays quiet and keeps what is on screen', async () => {
    const { result, notify } = await settledScene({ tokens: [token('a', 1)] });
    cloud.listTokenRevisions.mockRejectedValueOnce(new Error('Offline'));
    await act(async () => { await result.current.reconcileContent(); });
    expect(notify).not.toHaveBeenCalled();
    expect(result.current.tokens).toEqual([token('a', 1)]);
  });
});
