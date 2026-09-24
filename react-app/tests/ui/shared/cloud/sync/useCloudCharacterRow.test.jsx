import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const m = vi.hoisted(() => ({
  channels: [],
  get: vi.fn(),
  revision: vi.fn(),
  removeChannel: vi.fn(),
}));

vi.mock('../../../../../src/shared/cloud/auth/AuthProvider.jsx', () => ({
  useAuth: () => ({ cloudEnabled: true, status: 'authed', user: { id: 'viewer' } }),
}));
vi.mock('../../../../../src/shared/cloud/supabaseClient.js', () => ({
  supabase: {
    channel: (topic) => {
      const channel = {
        topic,
        on(_type, filter, receive) { this.filter = filter; this.receive = receive; return this; },
        subscribe(status) { this.status = status; return this; },
      };
      m.channels.push(channel);
      return channel;
    },
    removeChannel: (...args) => m.removeChannel(...args),
  },
}));
vi.mock('../../../../../src/shared/cloud/api/cloudCharacters.js', () => ({
  getCloudCharacter: (...args) => m.get(...args),
  getCloudCharacterRevision: (...args) => m.revision(...args),
}));

import { useCloudCharacterRow, CHARACTER_CHECK_MS } from '../../../../../src/shared/cloud/sync/useCloudCharacterRow.js';
import { publishCharacterVitals, requestCharacterRecheck } from '../../../../../src/shared/cloud/sync/characterEvents.js';

const row = (revision, notes = `rev ${revision}`) => ({ id: 'pc', row_revision: revision, data: { name: 'Fighter', notes } });
const channel = () => m.channels.at(-1);
const settle = () => act(async () => { await vi.advanceTimersByTimeAsync(0); });
// A server whose row is at `revision`.
function serverAt(revision) {
  m.get.mockImplementation(async () => row(revision));
  m.revision.mockImplementation(async () => revision);
}

beforeEach(() => {
  vi.useFakeTimers();
  m.channels = [];
  m.get.mockReset();
  m.revision.mockReset();
  m.removeChannel.mockReset();
  serverAt(1);
});
afterEach(() => { vi.useRealTimers(); });

async function openViewer() {
  const view = renderHook(() => useCloudCharacterRow('pc', { live: true }));
  await settle();
  act(() => channel().status('SUBSCRIBED'));
  await settle();
  return view;
}

describe('useCloudCharacterRow (read-only viewer)', () => {
  test('mount: one full read; SUBSCRIBED only checks the revision', async () => {
    const { result } = await openViewer();
    expect(result.current.row).toEqual(row(1));
    expect(m.get).toHaveBeenCalledOnce();
    expect(m.revision).toHaveBeenCalledOnce();
    expect(channel().filter).toEqual({ event: 'UPDATE', schema: 'public', table: 'characters', filter: 'id=eq.pc' });
  });

  test('SUBSCRIBED before the first read answers waits for it, then checks once', async () => {
    let finish;
    m.get.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    const { result } = renderHook(() => useCloudCharacterRow('pc', { live: true }));
    act(() => channel().status('SUBSCRIBED'));
    await settle();
    expect(m.revision).not.toHaveBeenCalled();
    await act(async () => finish(row(1)));
    await settle();
    expect(result.current.row).toEqual(row(1));
    expect(m.revision).toHaveBeenCalledOnce();
    expect(m.get).toHaveBeenCalledOnce();
  });

  test('idle: every safety tick is a revision check, never the sheet', async () => {
    await openViewer();
    await act(async () => { await vi.advanceTimersByTimeAsync(6 * CHARACTER_CHECK_MS); });
    expect(m.revision).toHaveBeenCalledTimes(7);
    expect(m.get).toHaveBeenCalledOnce();
  });

  test('a moved revision downloads the row exactly once', async () => {
    const { result } = await openViewer();
    serverAt(4);
    await act(async () => { await vi.advanceTimersByTimeAsync(CHARACTER_CHECK_MS); });
    expect(result.current.row).toEqual(row(4));
    expect(m.get).toHaveBeenCalledTimes(2);
    await act(async () => { await vi.advanceTimersByTimeAsync(CHARACTER_CHECK_MS); });
    expect(m.get).toHaveBeenCalledTimes(2);
  });

  test('realtime rows apply directly; an older or equal one is ignored', async () => {
    const { result } = await openViewer();
    act(() => channel().receive({ new: row(3, 'edited elsewhere') }));
    expect(result.current.row.data.notes).toBe('edited elsewhere');
    act(() => channel().receive({ new: row(2, 'late') }));
    act(() => channel().receive({ new: row(3, 'duplicate') }));
    expect(result.current.row.data.notes).toBe('edited elsewhere');
    expect(m.get).toHaveBeenCalledOnce();
  });

  test('a realtime row that lands during a check wins over the older read', async () => {
    const { result } = await openViewer();
    let finish;
    m.revision.mockResolvedValue(2);
    m.get.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    act(() => window.dispatchEvent(new Event('online')));
    await settle();
    act(() => channel().receive({ new: row(5, 'newest') }));
    await act(async () => finish(row(2, 'stale read')));
    expect(result.current.row.data.notes).toBe('newest');
  });

  test('a payload Realtime trimmed triggers a check instead of being dropped', async () => {
    const { result } = await openViewer();
    serverAt(6);
    act(() => channel().receive({ new: { id: 'pc', row_revision: 6 } }));
    await settle();
    expect(result.current.row).toEqual(row(6));
  });

  test('reconnect: a change made while offline converges when the tab is back online', async () => {
    const { result } = await openViewer();
    serverAt(9); // another client saved while this one was offline
    act(() => window.dispatchEvent(new Event('online')));
    await settle();
    expect(result.current.row).toEqual(row(9));
  });

  test('a returning tab checks once, not once per focus and visibility event', async () => {
    await openViewer();
    m.revision.mockClear();
    act(() => {
      window.dispatchEvent(new Event('focus'));
      document.dispatchEvent(new Event('visibilitychange'));
      window.dispatchEvent(new Event('focus'));
    });
    await settle();
    expect(m.revision).toHaveBeenCalledOnce();
  });

  test('a health command answer (vitals only) is never taken for the sheet', async () => {
    const { result } = await openViewer();
    act(() => publishCharacterVitals({
      applied: true, characterId: 'pc', digestRevision: 9, hpBasis: 'h1', vitals: { currentHP: 1 },
    }));
    expect(result.current.row).toEqual(row(1));
    // The sheet itself arrives through Realtime, as for any other change.
    act(() => channel().receive({ new: row(2, 'after the command') }));
    expect(result.current.row.data.notes).toBe('after the command');
  });

  test('a failed command of this tab triggers a revision check of that character only', async () => {
    await openViewer();
    m.revision.mockClear();
    act(() => requestCharacterRecheck('someone-else'));
    act(() => requestCharacterRecheck('pc'));
    await settle();
    expect(m.revision).toHaveBeenCalledOnce();
  });

  test('a failed first read shows the error; a later recovery still fills the sheet', async () => {
    m.get.mockRejectedValueOnce(new Error('offline'));
    const { result } = renderHook(() => useCloudCharacterRow('pc', { live: true }));
    await settle();
    expect(result.current).toMatchObject({ row: null, loading: false, error: 'offline' });
    act(() => window.dispatchEvent(new Event('online')));
    await settle();
    expect(result.current.row).toEqual(row(1));
  });
});

test('without live the row is read once and nothing follows it', async () => {
  const { result, unmount } = renderHook(() => useCloudCharacterRow('pc'));
  await settle();
  expect(result.current.row).toEqual(row(1));
  await act(async () => { await vi.advanceTimersByTimeAsync(5 * CHARACTER_CHECK_MS); });
  act(() => window.dispatchEvent(new Event('online')));
  await settle();
  expect(m.channels).toHaveLength(0);
  expect(m.get).toHaveBeenCalledOnce();
  expect(m.revision).not.toHaveBeenCalled();
  unmount();
});

test('no id: nothing is read', async () => {
  const { result } = renderHook(() => useCloudCharacterRow(null, { live: true }));
  await settle();
  expect(result.current).toEqual({ row: null, loading: false, error: 'No sheet id.' });
  expect(m.get).not.toHaveBeenCalled();
  expect(m.channels).toHaveLength(0);
});
