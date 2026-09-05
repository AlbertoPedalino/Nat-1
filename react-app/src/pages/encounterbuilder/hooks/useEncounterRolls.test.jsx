import { act, renderHook } from '@testing-library/react';
import { useReducer } from 'react';
import { useEncounterRolls } from './useEncounterRolls.js';
import { encounterReducer, createInitialState } from '../state/reducer.js';

const channel = vi.hoisted(() => ({ publish: vi.fn(), onRoll: null, campaignId: null }));
vi.mock('../../../shared/cloud/useRollChannel.js', () => ({ useRollChannel: (options) => {
  channel.onRoll = options.onRoll;
  channel.campaignId = options.campaignId;
  return { publish: channel.publish };
} }));

const campaigns = [{ id: 'campaign', name: 'Campaign' }];
const players = [{ campaignId: 'campaign' }];
const monsterRoll = { type: 'Claw', result: 17, mathStr: '1d20 (12) +5', naturalD20: 12, note: 'Hit' };
function openRolls() {
  return renderHook(() => {
    const [state, dispatch] = useReducer(encounterReducer, undefined, createInitialState);
    return { state, sync: useEncounterRolls({ instanceId: 'enc', players, campaigns, dispatch }) };
  });
}
beforeEach(() => { localStorage.clear(); channel.publish.mockReset(); });

test('infers the imported party campaign and keeps monster/custom rolls private by default', () => {
  const { result } = openRolls();
  expect(channel.campaignId).toBe('campaign');
  act(() => result.current.sync.shareRoll(monsterRoll, 'Goblin'));
  expect(result.current.state.rollLog[0]).toMatchObject({ actor: 'Goblin', result: 17, visibility: 'gm' });
  expect(channel.publish).toHaveBeenLastCalledWith(expect.objectContaining({
    actorName: 'Goblin', total: 17, rolls: [{ v: 12, faces: 20 }], note: 'Hit',
  }), { visibility: 'gm' });
  act(() => result.current.sync.shareRoll({ ...monsterRoll, type: 'Custom Roll' }, null));
  expect(channel.publish).toHaveBeenLastCalledWith(expect.objectContaining({ actorName: 'GM' }), { visibility: 'gm' });
});

test('visibility affects only future rolls and persists when the builder reopens', () => {
  const { result, unmount } = openRolls();
  act(() => result.current.sync.shareRoll(monsterRoll, 'Goblin'));
  act(() => result.current.sync.updateSettings({ showToPlayers: true }));
  expect(channel.publish).toHaveBeenCalledTimes(1);
  act(() => result.current.sync.shareRoll(monsterRoll, 'Goblin'));
  expect(channel.publish).toHaveBeenLastCalledWith(expect.anything(), { visibility: 'public' });
  unmount();
  expect(openRolls().result.current.sync.showToPlayers).toBe(true);
});

test('receives player and map rolls once, without rebroadcasting them', () => {
  const { result } = openRolls();
  const roll = { id: 'remote', actorName: 'Wizard', label: 'Arcana', total: 18, detail: '1d20+4' };
  act(() => { channel.onRoll(roll); channel.onRoll(roll); });
  expect(result.current.state.rollLog).toHaveLength(1);
  expect(result.current.state.rollLog[0]).toMatchObject({ actor: 'Wizard', type: 'Arcana', result: 18 });
  expect(channel.publish).not.toHaveBeenCalled();
});
