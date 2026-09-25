import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const m = vi.hoisted(() => ({ channels: [], revision: vi.fn(), removeChannel: vi.fn() }));

vi.mock('../../../../../src/shared/cloud/auth/AuthProvider.jsx', () => ({
  useAuth: () => ({ cloudEnabled: true, status: 'authed', user: { id: 'player' } }),
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
  getCloudSheetRevision: (...args) => m.revision(...args),
}));

import { useCharacterSheetRevision } from '../../../../../src/shared/cloud/sync/useCharacterSheetRevision.js';
import { publishCharacterSheetSaved } from '../../../../../src/shared/cloud/sync/characterEvents.js';

const channel = () => m.channels.at(-1);
const event = (revision) => ({ eventType: 'UPDATE', new: { character_id: 'pc', sheet_revision: revision } });
const settle = () => act(async () => { await vi.advanceTimersByTimeAsync(0); });

function follow(overrides = {}) {
  const props = { onNewer: vi.fn(), onDeleted: vi.fn(), busy: false, base: 5, ...overrides };
  const view = renderHook(({ base, busy }) => useCharacterSheetRevision({
    characterId: 'pc',
    baseRevision: base,
    isBusy: () => busy,
    onNewer: props.onNewer,
    onDeleted: props.onDeleted,
  }), { initialProps: { base: props.base, busy: props.busy } });
  return { ...view, props };
}

beforeEach(() => {
  vi.useFakeTimers();
  m.channels = [];
  m.revision.mockReset().mockResolvedValue(5);
  m.removeChannel.mockReset();
});
afterEach(() => { vi.useRealTimers(); });

describe('useCharacterSheetRevision', () => {
  test('one channel on character_sheet_revisions for this character; nothing before a sheet is loaded', async () => {
    const early = follow({ base: null });
    expect(m.channels).toHaveLength(0);
    early.rerender({ base: 5, busy: false });
    expect(m.channels).toHaveLength(1);
    expect(channel().filter).toEqual({
      event: '*', schema: 'public', table: 'character_sheet_revisions', filter: 'character_id=eq.pc',
    });
  });

  test('an external newer revision calls onNewer exactly once; equal or older ones never', async () => {
    const { props } = follow();
    act(() => channel().receive(event(5)));
    act(() => channel().receive(event(4)));
    expect(props.onNewer).not.toHaveBeenCalled();
    act(() => channel().receive(event(6)));
    act(() => channel().receive(event(6)));
    expect(props.onNewer).toHaveBeenCalledTimes(1);
    expect(props.onNewer).toHaveBeenCalledWith(6);
    // A recovery read of the same revision does not download it again.
    m.revision.mockResolvedValue(6);
    act(() => window.dispatchEvent(new Event('online')));
    await settle();
    expect(props.onNewer).toHaveBeenCalledTimes(1);
  });

  test('a failed download is retried by the next recovery trigger', async () => {
    const onNewer = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(undefined);
    follow({ onNewer });
    act(() => channel().receive(event(6)));
    await settle();
    m.revision.mockResolvedValue(6);
    act(() => window.dispatchEvent(new Event('online')));
    await settle();
    expect(onNewer).toHaveBeenCalledTimes(2);
  });

  test('while the download runs, further revisions wait, then only a still-newer one is acted on', async () => {
    let finish;
    const onNewer = vi.fn(() => new Promise((resolve) => { finish = resolve; }));
    const view = follow({ onNewer });
    act(() => channel().receive(event(6)));
    act(() => channel().receive(event(7)));
    expect(onNewer).toHaveBeenCalledTimes(1);
    view.rerender({ base: 7, busy: false }); // the view applied revision 7
    await act(async () => finish());
    expect(onNewer).toHaveBeenCalledTimes(1);
  });

  test('own save: its revision is known, so its echo — even before the save answers — is ignored', async () => {
    const view = follow({ busy: true }); // a save is in flight
    act(() => channel().receive(event(6))); // the echo arrives first
    expect(view.props.onNewer).not.toHaveBeenCalled();
    view.rerender({ base: 5, busy: false });
    act(() => view.result.current.noteSaved(6)); // then the save answers with 6
    expect(view.props.onNewer).not.toHaveBeenCalled();
    act(() => publishCharacterSheetSaved('pc', 7)); // a save of this tab elsewhere (autosync)
    act(() => channel().receive(event(7)));
    expect(view.props.onNewer).not.toHaveBeenCalled();
  });

  test('a change held while busy is acted on when the view settles, if the save did not cover it', async () => {
    const view = follow({ busy: true });
    act(() => channel().receive(event(8)));
    view.rerender({ base: 5, busy: false });
    act(() => view.result.current.noteSaved(6));
    expect(view.props.onNewer).toHaveBeenCalledWith(8);
  });

  test.each([
    ['SUBSCRIBED', () => channel().status('SUBSCRIBED')],
    ['focus', () => window.dispatchEvent(new Event('focus'))],
    ['online', () => window.dispatchEvent(new Event('online'))],
  ])('%s recovers with one light read', async (_label, trigger) => {
    const { props } = follow();
    m.revision.mockResolvedValue(9);
    act(trigger);
    await settle();
    expect(m.revision).toHaveBeenCalledTimes(1);
    expect(props.onNewer).toHaveBeenCalledWith(9);
  });

  test('no periodic timer: hours idle read nothing', async () => {
    follow();
    await act(async () => { await vi.advanceTimersByTimeAsync(6 * 60 * 60 * 1000); });
    expect(m.revision).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  test('deleted: a DELETE event or a recovery read finding nothing', async () => {
    const { props } = follow();
    act(() => channel().receive({ eventType: 'DELETE', old: { character_id: 'pc' } }));
    expect(props.onDeleted).toHaveBeenCalledTimes(1);
    m.revision.mockResolvedValue(null);
    act(() => window.dispatchEvent(new Event('online')));
    await settle();
    expect(props.onDeleted).toHaveBeenCalledTimes(2);
    expect(props.onNewer).not.toHaveBeenCalled();
  });
});
