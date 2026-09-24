import { useReducer } from 'react';
import { act, render, waitFor } from '@testing-library/react';
import { createInitialState, encounterReducer } from '../../../../../src/pages/encounterbuilder/state/reducer.js';
import { beforeEach, vi } from 'vitest';
import { useCloudFights } from '../../../../../src/pages/encounterbuilder/sync/useCloudFights.js';

const mocks = vi.hoisted(() => ({
  listInstanceFights: vi.fn(),
  saveInstanceFight: vi.fn(),
  deleteInstanceFight: vi.fn(),
  subscribeInstanceFights: vi.fn(),
  getInstanceFight: vi.fn(),
  notify: vi.fn(),
  fireRemoteChange: null,
  fireStatus: null,
}));

vi.mock('../../../../../src/shared/cloud/api/encounterFights.js', () => ({
  listInstanceFights: mocks.listInstanceFights,
  saveInstanceFight: mocks.saveInstanceFight,
  deleteInstanceFight: mocks.deleteInstanceFight,
  getInstanceFight: mocks.getInstanceFight,
  subscribeInstanceFights: (instanceId, onChange, options) => {
    mocks.fireRemoteChange = onChange;
    mocks.fireStatus = options?.onStatus || null;
    return mocks.subscribeInstanceFights(instanceId, onChange);
  },
}));

vi.mock('../../../../../src/shared/cloud/auth/AuthProvider.jsx', () => ({
  useAuth: () => ({ cloudEnabled: true, status: 'authed' }),
}));

vi.mock('../../../../../src/shared/ui/ToastProvider.jsx', () => ({
  useToast: () => ({ notify: mocks.notify }),
}));

const CARD = { id: 500, name: 'Ebonscar — room 3', encounter: [] };
const FIGHT = {
  id: 900,
  name: 'Ebonscar — room 3',
  savedAt: 10,
  encounterId: 500,
  encounter: CARD,
  fight: { combatants: [], currentTurn: 0, round: 1 },
};

function Harness({ fights, library, dispatch }) {
  useCloudFights({
    instanceId: 'enc_a',
    instanceSaved: true,
    fights,
    library,
    activeFightId: null,
    dispatch,
  });
  return null;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.fireRemoteChange = null;
  mocks.saveInstanceFight.mockResolvedValue(null);
  mocks.deleteInstanceFight.mockResolvedValue(undefined);
  mocks.subscribeInstanceFights.mockReturnValue(() => {});
});

test('a fight from another screen arrives with the card that opens it', async () => {
  mocks.listInstanceFights.mockResolvedValue([FIGHT]);
  const dispatch = vi.fn();
  render(<Harness fights={[]} library={[]} dispatch={dispatch} />);

  await waitFor(() => expect(dispatch).toHaveBeenCalled());
  expect(dispatch).toHaveBeenCalledWith({
    type: 'absorbExternal',
    fights: [FIGHT],
    library: [CARD],
  });
});

test('keeping an old fight active never deletes a newer launch discovered online', async () => {
  const newer = { ...FIGHT, id: 901, savedAt: 30 };
  let rows = [FIGHT];
  mocks.listInstanceFights.mockImplementation(async () => rows);
  mocks.deleteInstanceFight.mockImplementation(async (id) => {
    rows = rows.filter((row) => String(row.id) !== id);
  });
  let current;
  let dispatch;
  function Builder() {
    [current, dispatch] = useReducer(encounterReducer, {
      ...createInitialState(), fights: [FIGHT], library: [CARD], activeFightId: FIGHT.id,
    });
    useCloudFights({
      instanceId: 'enc_a', instanceSaved: true,
      fights: current.fights, library: current.library, activeFightId: current.activeFightId,
      dispatch,
    });
    return null;
  }
  render(<Builder />);
  await act(async () => { await mocks.fireRemoteChange(); });
  rows = [newer, FIGHT];
  await act(async () => { await mocks.fireRemoteChange(); });
  expect(current.fights.map((fight) => fight.id)).toEqual([900]);
  expect(mocks.deleteInstanceFight).not.toHaveBeenCalled();
  // Repeated reads and an explicit deletion of the old fight must still leave
  // the newer launch intact on the other screen.
  await act(async () => { await mocks.fireRemoteChange(); });
  await act(async () => { dispatch({ type: 'deleteFight', id: 900 }); });
  expect(mocks.deleteInstanceFight).toHaveBeenCalledWith('900');
  expect(mocks.deleteInstanceFight).not.toHaveBeenCalledWith('901');
  expect(rows.map((row) => row.id)).toEqual([901]);
  expect(current.fights.map((fight) => fight.id)).toEqual([901]);
});

// The bug this exists for: deleting an encounter put it straight back. A read
// cannot tell "never seen" from "just deleted", so any refresh landing while
// the row was still there restored the fight — and with it the library card it
// carries.
test('a deleted encounter stays deleted, however the reads land', async () => {
  // A delete that takes its time: the row is still there until it lands.
  let landed;
  const gate = new Promise((resolve) => { landed = resolve; });
  let gone = false;
  mocks.listInstanceFights.mockImplementation(async () => (gone ? [] : [FIGHT]));
  mocks.deleteInstanceFight.mockImplementation(async () => { await gate; gone = true; });

  const dispatch = vi.fn();
  const view = render(<Harness fights={[FIGHT]} library={[CARD]} dispatch={dispatch} />);
  await waitFor(() => expect(mocks.listInstanceFights).toHaveBeenCalled());
  dispatch.mockClear();

  // The GM deletes the encounter: the reducer drops the card and its fight.
  view.rerender(<Harness fights={[]} library={[]} dispatch={dispatch} />);
  await waitFor(() => expect(mocks.deleteInstanceFight).toHaveBeenCalledWith('900'));

  // A read lands while the row is still standing. This is the whole bug: a read
  // cannot tell "never seen" from "just deleted", and it used to put the fight
  // back together with the library card it carries.
  await act(async () => { await mocks.fireRemoteChange(); });
  expect(dispatch).not.toHaveBeenCalled();

  // Now it lands. Nothing is left pending and nobody is warned.
  await act(async () => { landed(); await gate; });
  await act(async () => { await mocks.fireRemoteChange(); });
  const asked = mocks.deleteInstanceFight.mock.calls.length;
  await act(async () => { await mocks.fireRemoteChange(); });
  expect(mocks.deleteInstanceFight).toHaveBeenCalledTimes(asked);
  expect(dispatch).not.toHaveBeenCalled();
  expect(mocks.notify).not.toHaveBeenCalled();
});

// A save is debounced. Deleting inside that window used to let the timer put the
// row back after the delete had already run.
test('deleting cancels the write that was still waiting', async () => {
  vi.useFakeTimers();
  mocks.listInstanceFights.mockResolvedValue([FIGHT]);
  const dispatch = vi.fn();
  const view = render(<Harness fights={[FIGHT]} library={[CARD]} dispatch={dispatch} />);
  await vi.waitFor(() => expect(mocks.listInstanceFights).toHaveBeenCalled());

  // Changed here, so a write is scheduled…
  const wounded = { ...FIGHT, fight: { ...FIGHT.fight, round: 2 } };
  view.rerender(<Harness fights={[wounded]} library={[CARD]} dispatch={dispatch} />);
  // …and deleted before it fires.
  view.rerender(<Harness fights={[]} library={[]} dispatch={dispatch} />);
  await act(async () => { await vi.advanceTimersByTimeAsync(2000); });

  expect(mocks.saveInstanceFight).not.toHaveBeenCalled();
  expect(mocks.deleteInstanceFight).toHaveBeenCalledWith('900');
  vi.useRealTimers();
});

// Realtime reports a delete that worked and says nothing at all about one that
// failed, so the only way to know the row went is to look.
test('a delete that does not land is retried, then said out loud', async () => {
  // The row never goes, whatever we ask.
  mocks.listInstanceFights.mockResolvedValue([FIGHT]);
  mocks.deleteInstanceFight.mockRejectedValue(new Error('nope'));
  const dispatch = vi.fn();
  const view = render(<Harness fights={[FIGHT]} library={[CARD]} dispatch={dispatch} />);
  await waitFor(() => expect(mocks.listInstanceFights).toHaveBeenCalled());
  dispatch.mockClear();

  view.rerender(<Harness fights={[]} library={[]} dispatch={dispatch} />);

  // Asked a bounded number of times, not forever.
  await waitFor(() => expect(mocks.notify).toHaveBeenCalledWith('warning', expect.stringMatching(/could not be deleted online/i)));
  expect(mocks.deleteInstanceFight).toHaveBeenCalledTimes(3);
  const asked = mocks.deleteInstanceFight.mock.calls.length;

  // And the encounter still does not come back: a row we failed to delete is
  // not a fight from another screen.
  await act(async () => { await mocks.fireRemoteChange(); });
  expect(dispatch).not.toHaveBeenCalled();
  expect(mocks.deleteInstanceFight).toHaveBeenCalledTimes(asked);
  expect(mocks.notify).toHaveBeenCalledTimes(1);
});

// Deleting is not final in the other direction either: the same fight created
// again is a fight to write, not one to keep deleting.
test('a fight made again after a delete is written, not buried', async () => {
  mocks.listInstanceFights.mockResolvedValue([]);
  const dispatch = vi.fn();
  const view = render(<Harness fights={[FIGHT]} library={[CARD]} dispatch={dispatch} />);
  await waitFor(() => expect(mocks.listInstanceFights).toHaveBeenCalled());

  view.rerender(<Harness fights={[]} library={[]} dispatch={dispatch} />);
  await waitFor(() => expect(mocks.deleteInstanceFight).toHaveBeenCalled());

  view.rerender(<Harness fights={[FIGHT]} library={[CARD]} dispatch={dispatch} />);
  await waitFor(() => expect(mocks.saveInstanceFight).toHaveBeenCalledWith('enc_a', FIGHT));

  // Its row is not deleted again behind the write that just created it.
  mocks.listInstanceFights.mockResolvedValue([FIGHT]);
  await act(async () => { await mocks.fireRemoteChange(); });
  expect(mocks.deleteInstanceFight).toHaveBeenCalledTimes(1);
});

describe('realtime events without re-reading the instance', () => {
  const row = (id, at, patch = {}) => ({
    id: String(id), instance_id: 'enc_a', name: 'Room', encounter_id: '500',
    encounter: CARD, fight: { combatants: [], currentTurn: 0, round: 1 }, updated_at: at, ...patch,
  });
  const fightIds = (dispatch) => dispatch.mock.calls
    .filter(([action]) => action.type === 'absorbExternal')
    .flatMap(([action]) => action.fights.map((fight) => fight.id));

  async function mounted() {
    mocks.listInstanceFights.mockResolvedValue([FIGHT]);
    const dispatch = vi.fn();
    render(<Harness fights={[FIGHT]} library={[CARD]} dispatch={dispatch} />);
    await waitFor(() => expect(mocks.listInstanceFights).toHaveBeenCalledTimes(1));
    await act(async () => {});
    dispatch.mockClear();
    return dispatch;
  }

  test('a complete UPDATE is applied from the payload alone', async () => {
    const dispatch = await mounted();
    await act(async () => {
      await mocks.fireRemoteChange({ eventType: 'UPDATE', new: row(900, '2026-09-24T10:00:00Z') });
    });
    expect(mocks.listInstanceFights).toHaveBeenCalledTimes(1);
    expect(mocks.getInstanceFight).not.toHaveBeenCalled();
    expect(fightIds(dispatch)).toEqual([900]);
  });

  test('a complete INSERT arrives with its card, no full refresh', async () => {
    const dispatch = await mounted();
    const card = { ...CARD, id: 501 };
    await act(async () => {
      await mocks.fireRemoteChange({
        eventType: 'INSERT', new: row(901, '2026-09-24T10:00:00Z', { encounter_id: '501', encounter: card }),
      });
    });
    expect(mocks.listInstanceFights).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({
      type: 'absorbExternal', library: [card],
    }));
    expect(fightIds(dispatch)).toEqual([901]);
  });

  test('a DELETE re-reads the list', async () => {
    await mounted();
    await act(async () => {
      await mocks.fireRemoteChange({ eventType: 'DELETE', new: {}, old: { id: '900' } });
    });
    expect(mocks.listInstanceFights).toHaveBeenCalledTimes(2);
  });

  test('a row Realtime had to trim is fetched alone; a vanished one falls back to the list', async () => {
    const dispatch = await mounted();
    mocks.getInstanceFight.mockResolvedValueOnce(row(902, '2026-09-24T10:00:00Z'));
    await act(async () => {
      await mocks.fireRemoteChange({
        eventType: 'UPDATE', errors: ['Error 413: Payload Too Large'], new: { id: '902', instance_id: 'enc_a' },
      });
    });
    expect(mocks.getInstanceFight).toHaveBeenCalledWith('902');
    expect(mocks.listInstanceFights).toHaveBeenCalledTimes(1);
    expect(fightIds(dispatch)).toEqual([902]);

    mocks.getInstanceFight.mockResolvedValueOnce(null);
    await act(async () => {
      await mocks.fireRemoteChange({ eventType: 'UPDATE', new: { id: '903', instance_id: 'enc_a' } });
    });
    expect(mocks.listInstanceFights).toHaveBeenCalledTimes(2);
  });

  test('a reconnect recovers with a full read', async () => {
    await mounted();
    await act(async () => { await mocks.fireStatus('SUBSCRIBED'); });
    expect(mocks.listInstanceFights).toHaveBeenCalledTimes(2);
    await act(async () => { await mocks.fireStatus('CHANNEL_ERROR'); });
    expect(mocks.listInstanceFights).toHaveBeenCalledTimes(2);
  });

  test('an event before the first read lands is answered with the full read', async () => {
    let finish;
    mocks.listInstanceFights.mockReturnValueOnce(new Promise((resolve) => { finish = resolve; }))
      .mockResolvedValue([FIGHT]);
    render(<Harness fights={[]} library={[]} dispatch={vi.fn()} />);
    await act(async () => {
      mocks.fireRemoteChange({ eventType: 'UPDATE', new: row(900, '2026-09-24T10:00:00Z') });
    });
    expect(mocks.listInstanceFights).toHaveBeenCalledTimes(2);
    await act(async () => finish([FIGHT]));
  });
});
