import { act, render, waitFor } from '@testing-library/react';
import { beforeEach, vi } from 'vitest';
import { useCloudFights } from './useCloudFights.js';

const mocks = vi.hoisted(() => ({
  listInstanceFights: vi.fn(),
  saveInstanceFight: vi.fn(),
  deleteInstanceFight: vi.fn(),
  subscribeInstanceFights: vi.fn(),
  notify: vi.fn(),
  fireRemoteChange: null,
}));

vi.mock('../../../shared/cloud/encounterFights.js', () => ({
  listInstanceFights: mocks.listInstanceFights,
  saveInstanceFight: mocks.saveInstanceFight,
  deleteInstanceFight: mocks.deleteInstanceFight,
  subscribeInstanceFights: (instanceId, onChange) => {
    mocks.fireRemoteChange = onChange;
    return mocks.subscribeInstanceFights(instanceId, onChange);
  },
}));

vi.mock('../../../shared/cloud/AuthProvider.jsx', () => ({
  useAuth: () => ({ cloudEnabled: true, status: 'authed' }),
}));

vi.mock('../../../shared/ToastProvider.jsx', () => ({
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
