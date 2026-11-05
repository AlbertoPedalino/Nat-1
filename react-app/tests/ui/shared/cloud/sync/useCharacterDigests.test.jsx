import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const m = vi.hoisted(() => ({
  // The digest rows the database holds; both reads serve them.
  rows: [],
  list: vi.fn(),
  revisions: vi.fn(),
  sheets: vi.fn(),
  baseMax: vi.fn(),
  channels: [],
  removeChannel: vi.fn(),
  failSubscribe: false,
}));

vi.mock('../../../../../src/shared/cloud/auth/AuthProvider.jsx', () => ({
  useAuth: () => ({ cloudEnabled: true, status: 'authed', user: { id: 'gm' } }),
}));
vi.mock('../../../../../src/shared/cloud/supabaseClient.js', () => ({
  supabase: {
    channel: (topic) => {
      const channel = {
        topic,
        subscriptions: [],
        on(type, filter, callback) { this.subscriptions.push({ type, filter }); this.receive = callback; return this; },
        subscribe(callback) {
          if (m.failSubscribe) throw new Error('socket');
          this.status = callback;
          return this;
        },
      };
      m.channels.push(channel);
      return channel;
    },
    removeChannel: (...args) => m.removeChannel(...args),
  },
}));
vi.mock('../../../../../src/shared/cloud/api/characterDigests.js', async (original) => ({
  ...await original(),
  listCharacterDigests: (...args) => m.list(...args),
  listCharacterDigestRevisions: (...args) => m.revisions(...args),
  readCharacterSheets: (...args) => m.sheets(...args),
}));
vi.mock('../../../../../src/shared/campaign/characterVitals.js', () => ({
  readBaseMaxHp: (...args) => m.baseMax(...args),
}));

import { useCharacterDigests } from '../../../../../src/shared/cloud/sync/useCharacterDigests.js';
import { RECOVERY_INTERVAL_MS } from '../../../../../src/shared/cloud/sync/recoveryTriggers.js';
import { toCharacterDigest } from '../../../../../src/shared/campaign/characterDigest.js';
import { publishCharacterVitals, requestCharacterRecheck } from '../../../../../src/shared/cloud/sync/characterEvents.js';

const digestRow = (id, revision, patch = {}, campaign = 'camp') => ({
  character_id: id,
  campaign_id: campaign,
  owner: `owner-${id}`,
  row_revision: revision,
  digest: { name: id, currentHP: 10, tempHP: 0, maxHPBonus: 0, activeConditions: [], deathSaves: {}, hpBasis: 'h1', ...patch },
});
const digest = (...args) => toCharacterDigest(digestRow(...args));
const channel = () => m.channels.at(-1);
const send = (payload) => act(() => { channel().receive(payload); });

beforeEach(() => {
  m.channels = [];
  m.failSubscribe = false;
  m.removeChannel.mockReset();
  m.rows = [digest('pc', 1), digest('npc', 1, { currentHP: 7 })];
  const scoped = ({ campaignId, characterIds }) => m.rows.filter((row) => (
    campaignId ? row.campaignId === campaignId : characterIds.includes(row.characterId)
  ));
  m.list.mockReset().mockImplementation(async (scope) => scoped(scope));
  m.revisions.mockReset().mockImplementation(async (scope) => scoped(scope)
    .map((row) => ({ id: row.characterId, version: row.rowRevision })));
  m.sheets.mockReset().mockImplementation(async (ids) => ids.map((id) => ({ id, data: { level: 1 } })));
  m.baseMax.mockReset().mockImplementation(async (rows) => new Map(rows.map((row) => [row.id, 20])));
});

async function openCampaign() {
  const view = renderHook(() => useCharacterDigests({ campaignId: 'camp' }));
  await waitFor(() => expect(view.result.current.baseMax.get('pc')?.baseMax).toBe(20));
  return view;
}

describe('useCharacterDigests', () => {
  test('one campaign channel on character_digests; never the characters table', async () => {
    await openCampaign();
    expect(m.channels).toHaveLength(1);
    expect(channel().subscriptions).toEqual([{
      type: 'postgres_changes',
      filter: { event: '*', schema: 'public', table: 'character_digests', filter: 'campaign_id=eq.camp' },
    }]);
    expect(m.list).toHaveBeenCalledWith(expect.objectContaining({ campaignId: 'camp' }));
    // Both sheets read once, together, to derive their base maximum.
    expect(m.sheets).toHaveBeenCalledTimes(1);
    expect(m.sheets.mock.calls[0][0].sort()).toEqual(['npc', 'pc']);
  });

  test('HP and conditions arrive in the digest with no sheet download', async () => {
    const { result } = await openCampaign();
    await send({ eventType: 'UPDATE', new: digestRow('pc', 2, { currentHP: 4, activeConditions: ['prone'] }) });
    expect(result.current.digests.get('pc')).toMatchObject({ currentHP: 4, activeConditions: ['prone'] });
    expect(m.sheets).toHaveBeenCalledTimes(1);
  });

  test('a new max-HP basis reads only that character', async () => {
    const { result } = await openCampaign();
    m.baseMax.mockImplementation(async (rows) => new Map(rows.map((row) => [row.id, 28])));
    await send({ eventType: 'UPDATE', new: digestRow('pc', 3, { hpBasis: 'h2' }) });
    await waitFor(() => expect(result.current.baseMax.get('pc')).toEqual({ hpBasis: 'h2', baseMax: 28 }));
    expect(m.sheets).toHaveBeenCalledTimes(2);
    expect(m.sheets).toHaveBeenLastCalledWith(['pc']);
    expect(result.current.baseMax.get('npc').baseMax).toBe(20);
  });

  test('an older event is ignored; deletes and moves to another campaign leave the roster', async () => {
    const { result } = await openCampaign();
    await send({ eventType: 'UPDATE', new: digestRow('pc', 5, { currentHP: 3 }) });
    await send({ eventType: 'UPDATE', new: digestRow('pc', 4, { currentHP: 9 }) });
    expect(result.current.digests.get('pc').currentHP).toBe(3);
    await send({ eventType: 'UPDATE', new: digestRow('npc', 2, {}, 'other-campaign') });
    expect(result.current.digests.has('npc')).toBe(false);
    await send({ eventType: 'DELETE', old: { character_id: 'pc' } });
    expect(result.current.digests.size).toBe(0);
  });

  test('a health command answer shows at once, and its digest settles it', async () => {
    const { result } = await openCampaign();
    await act(async () => publishCharacterVitals({
      applied: true, characterId: 'pc', digestRevision: 2, hpBasis: 'h1', vitals: { currentHP: 6, activeConditions: [] },
    }));
    expect(result.current.digests.get('pc')).toMatchObject({ currentHP: 6, source: 'local', hpBasis: 'h1', rowRevision: 2 });
    await send({ eventType: 'UPDATE', new: digestRow('pc', 2, { currentHP: 6 }) });
    expect(result.current.digests.get('pc').source).toBe('server');
    expect(m.sheets).toHaveBeenCalledTimes(1);
  });

  test('a failed command of this tab makes followers of that character check their digests', async () => {
    await openCampaign();
    const checked = m.revisions.mock.calls.length;
    await act(async () => requestCharacterRecheck('stranger'));
    expect(m.revisions.mock.calls.length).toBe(checked);
    await act(async () => requestCharacterRecheck('pc'));
    expect(m.revisions.mock.calls.length).toBe(checked + 1);
    expect(m.sheets).toHaveBeenCalledTimes(1);
  });

  test('reconnect checks versions, reads only the digests that moved, keeps a newer one held', async () => {
    const { result } = await openCampaign();
    await send({ eventType: 'UPDATE', new: digestRow('pc', 5, { currentHP: 2 }) });
    m.rows = [digest('pc', 4, { currentHP: 9 }), digest('npc', 3, { currentHP: 1 }), digest('new', 1)];
    m.list.mockClear();
    await act(async () => { channel().status('SUBSCRIBED'); });
    await waitFor(() => expect(result.current.digests.has('new')).toBe(true));
    expect(m.list).toHaveBeenCalledTimes(1);
    expect(m.list.mock.calls[0][0].characterIds.sort()).toEqual(['new', 'npc']);
    expect(result.current.digests.get('pc').currentHP).toBe(2);
    expect(result.current.digests.get('npc').currentHP).toBe(1);
    await waitFor(() => expect(result.current.baseMax.has('new')).toBe(true));
    expect(m.sheets).toHaveBeenLastCalledWith(['new']);
  });

  test('opening reads the digests once, with no version check first', async () => {
    await openCampaign();
    expect(m.list).toHaveBeenCalledTimes(1);
    expect(m.revisions).not.toHaveBeenCalled();
  });

  test('a character that left while an event was missed leaves on the next check', async () => {
    const { result } = await openCampaign();
    m.rows = m.rows.filter((row) => row.characterId !== 'npc');
    m.list.mockClear();
    await act(async () => { await result.current.reconcile(); });
    expect(result.current.digests.has('npc')).toBe(false);
    expect(result.current.digests.has('pc')).toBe(true);
    expect(m.list).not.toHaveBeenCalled();
  });

  test('a sheet the rules cannot read is not re-read on every tick; a network failure is retried', async () => {
    m.baseMax.mockImplementation(async () => new Map());
    const { result } = renderHook(() => useCharacterDigests({ campaignId: 'camp' }));
    await waitFor(() => expect(result.current.baseMax.get('pc')).toEqual({ hpBasis: 'h1', baseMax: null }));
    await act(async () => { await result.current.reconcile(); });
    expect(m.sheets).toHaveBeenCalledTimes(1);

    m.sheets.mockRejectedValueOnce(new Error('offline'));
    await send({ eventType: 'UPDATE', new: digestRow('pc', 2, { hpBasis: 'h3' }) });
    await act(async () => {});
    expect(m.sheets).toHaveBeenCalledTimes(2);
    m.baseMax.mockImplementation(async (rows) => new Map(rows.map((row) => [row.id, 11])));
    await act(async () => { await result.current.reconcile(); });
    await waitFor(() => expect(result.current.baseMax.get('pc')).toEqual({ hpBasis: 'h3', baseMax: 11 }));
  });

  test('exact characters share one channel with an id filter; no scope opens nothing', async () => {
    renderHook(() => useCharacterDigests({ characterIds: ['c_b', 'c_a', 'c_a'] }));
    await act(async () => {});
    expect(channel().subscriptions[0].filter.filter).toBe('character_id=in.(c_a,c_b)');
    m.channels = [];
    renderHook(() => useCharacterDigests({ characterIds: [] }));
    await act(async () => {});
    expect(m.channels).toHaveLength(0);
  });

  test('a consumer that derives its own maximum never reads a sheet, whatever the basis', async () => {
    const { result } = renderHook(() => useCharacterDigests({ characterIds: ['pc'], deriveMaxHp: false }));
    await waitFor(() => expect(result.current.digests.get('pc')?.hpBasis).toBe('h1'));
    await send({ eventType: 'UPDATE', new: digestRow('pc', 2, { hpBasis: 'h2', currentHP: 3 }) });
    await act(async () => { await result.current.reconcile(); });
    expect(result.current.digests.get('pc')).toMatchObject({ hpBasis: 'h2', currentHP: 3 });
    expect(result.current.baseMax.size).toBe(0);
    expect(m.sheets).not.toHaveBeenCalled();
  });

  test('a channel that fails half-way through setup is removed', async () => {
    m.failSubscribe = true;
    renderHook(() => useCharacterDigests({ campaignId: 'camp' }));
    await act(async () => {});
    expect(m.removeChannel).toHaveBeenCalledWith(m.channels[0]);
  });

});

describe('useCharacterDigests recovery: events and the shared interval', () => {
  let visibility = 'visible';

  beforeEach(() => {
    visibility = 'visible';
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => visibility });
  });

  afterEach(() => {
    vi.useRealTimers();
    delete document.visibilityState;
  });

  const setVisibility = (state) => act(() => {
    visibility = state;
    document.dispatchEvent(new Event('visibilitychange'));
  });
  const fire = (type) => act(() => { window.dispatchEvent(new Event(type)); });

  test('an idle roster checks only versions, once per recovery interval: no digest, no sheet', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    await openCampaign();
    await act(async () => { channel().status('SUBSCRIBED'); });
    const listed = m.list.mock.calls.length;
    const checked = m.revisions.mock.calls.length;
    const read = m.sheets.mock.calls.length;
    await act(async () => { await vi.advanceTimersByTimeAsync(10 * RECOVERY_INTERVAL_MS); });
    expect(m.revisions.mock.calls.length - checked).toBe(10);
    expect(m.list.mock.calls.length).toBe(listed);
    expect(m.sheets.mock.calls.length).toBe(read);
  });

  test('coming back to the tab reconciles once per return: focus, then hidden -> visible', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    await openCampaign();
    const checked = m.revisions.mock.calls.length;
    await fire('focus');
    expect(m.revisions.mock.calls.length).toBe(checked + 1);
    // The visibilitychange of the same return is coalesced with its focus.
    await setVisibility('visible');
    expect(m.revisions.mock.calls.length).toBe(checked + 1);
    await act(async () => { await vi.advanceTimersByTimeAsync(5_000); });
    await setVisibility('hidden');
    expect(m.revisions.mock.calls.length).toBe(checked + 1);
    await setVisibility('visible');
    expect(m.revisions.mock.calls.length).toBe(checked + 2);
  });

  test('going back online reconciles', async () => {
    await openCampaign();
    const checked = m.revisions.mock.calls.length;
    await fire('offline');
    expect(m.revisions.mock.calls.length).toBe(checked);
    await fire('online');
    expect(m.revisions.mock.calls.length).toBe(checked + 1);
  });

  test('the first SUBSCRIBED and every rejoin reconcile', async () => {
    await openCampaign();
    const checked = m.revisions.mock.calls.length;
    await act(async () => { channel().status('SUBSCRIBED'); });
    expect(m.revisions.mock.calls.length).toBe(checked + 1);
    await act(async () => { channel().status('CHANNEL_ERROR'); });
    expect(m.revisions.mock.calls.length).toBe(checked + 1);
    await act(async () => { channel().status('SUBSCRIBED'); });
    expect(m.revisions.mock.calls.length).toBe(checked + 2);
  });

  test('a character inserted into the campaign arrives through Realtime alone', async () => {
    const { result } = await openCampaign();
    const listed = m.list.mock.calls.length;
    await send({ eventType: 'INSERT', new: digestRow('newcomer', 1, { currentHP: 12 }) });
    expect(result.current.digests.get('newcomer')).toMatchObject({ currentHP: 12, campaignId: 'camp' });
    await waitFor(() => expect(result.current.baseMax.get('newcomer')?.baseMax).toBe(20));
    expect(m.sheets).toHaveBeenLastCalledWith(['newcomer']);
    expect(m.list.mock.calls.length).toBe(listed);
  });

  test('a base maximum that failed to derive is retried by the next event-driven reconcile', async () => {
    const { result } = await openCampaign();
    m.sheets.mockRejectedValueOnce(new Error('network'));
    await send({ eventType: 'UPDATE', new: digestRow('pc', 2, { hpBasis: 'h2' }) });
    await waitFor(() => expect(m.sheets).toHaveBeenCalledTimes(2));
    await act(async () => {});
    expect(result.current.baseMax.get('pc').hpBasis).toBe('h1');
    m.baseMax.mockImplementation(async (rows) => new Map(rows.map((row) => [row.id, 26])));
    await fire('online');
    await waitFor(() => expect(result.current.baseMax.get('pc')).toEqual({ hpBasis: 'h2', baseMax: 26 }));
    expect(m.sheets).toHaveBeenCalledTimes(3);
    expect(m.sheets).toHaveBeenLastCalledWith(['pc']);
  });
});
